// Edge Function to sync weather data from OpenWeather API
// Runs hourly via pg_cron to fetch weather for all active stations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY')
const OPENWEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5/weather'

interface OpenWeatherResponse {
  coord: { lon: number; lat: number }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
    sea_level?: number
    grnd_level?: number
  }
  visibility: number
  wind: {
    speed: number
    deg: number
    gust?: number
  }
  rain?: {
    '1h'?: number
    '3h'?: number
  }
  clouds: { all: number }
  dt: number
  sys: {
    type?: number
    id?: number
    country: string
    sunrise: number
    sunset: number
  }
  timezone: number
  id: number
  name: string
  cod: number
}

/**
 * Convert Kelvin to Celsius
 */
function kelvinToCelsius(kelvin: number): number {
  return Math.round((kelvin - 273.15) * 100) / 100
}

/**
 * Main handler for the Edge Function
 * Fetches weather data from OpenWeather API for all active stations
 * and upserts into the weather_measurements table
 */
serve(async (req: Request) => {
  try {
    // Create Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all active stations with coordinates
    const { data: stations, error: stationsError } = await supabase
      .from('stations')
      .select('id, station_code, name, latitude, longitude')
      .eq('is_deleted', false)

    if (stationsError) {
      console.error('Error fetching stations:', stationsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stations', details: stationsError.message }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!stations || stations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active stations found' }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting weather sync for ${stations.length} stations...`)

    const results: Array<{ station: string; success: boolean }> = []
    const errors: Array<{ station: string; error: string }> = []

    // Process each station sequentially to avoid rate limiting
    for (const station of stations) {
      try {
        console.log(`Fetching weather for station: ${station.name} (${station.latitude}, ${station.longitude})`)
        
        // Call OpenWeather API
        const weatherUrl = `${OPENWEATHER_API_BASE}?lat=${station.latitude}&lon=${station.longitude}&appid=${OPENWEATHER_API_KEY}`
        const response = await fetch(weatherUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SWFM-WeatherSync/1.0'
          }
        })
        
        if (!response.ok) {
          errors.push({ 
            station: station.station_code, 
            error: `HTTP ${response.status}: ${response.statusText}` 
          })
          continue
        }

        const weatherData: OpenWeatherResponse = await response.json()

        if (weatherData.cod !== 200) {
          errors.push({ station: station.station_code, error: `API error: ${weatherData.cod}` })
          continue
        }

        // Convert timestamp from API (Unix seconds) to ISO string
        const measuredAt = new Date(weatherData.dt * 1000).toISOString()

        // Upsert weather measurement (unique constraint on station_id + measured_at)
        const { error: upsertError } = await supabase
          .from('weather_measurements')
          .upsert({
            station_id: station.id,
            measured_at: measuredAt,
            temperature: kelvinToCelsius(weatherData.main.temp),
            temp_min: kelvinToCelsius(weatherData.main.temp_min),
            temp_max: kelvinToCelsius(weatherData.main.temp_max),
            feels_like: kelvinToCelsius(weatherData.main.feels_like),
            pressure: weatherData.main.pressure,
            humidity: weatherData.main.humidity,
            wind_speed: weatherData.wind.speed,
            wind_deg: weatherData.wind.deg,
            rain_1h: weatherData.rain?.['1h'] ?? null,
            clouds: weatherData.clouds.all,
            visibility: weatherData.visibility,
            weather_main: weatherData.weather[0]?.main ?? null,
            weather_description: weatherData.weather[0]?.description ?? null
          }, { 
            onConflict: 'station_id,measured_at',
            ignoreDuplicates: false 
          })

        if (upsertError) {
          console.error(`Error upserting weather for ${station.station_code}:`, upsertError)
          errors.push({ station: station.station_code, error: upsertError.message })
        } else {
          results.push({ station: station.station_code, success: true })
          console.log(`✓ Weather synced: ${station.name} - ${weatherData.weather[0]?.main}, ${kelvinToCelsius(weatherData.main.temp)}°C`)
        }

        // Small delay between requests to avoid rate limiting (60 calls/minute free tier)
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (e) {
        console.error(`Exception for ${station.station_code}:`, e)
        errors.push({ station: station.station_code, error: String(e) })
      }
    }

    // Log sync result to sync_logs table
    const { error: logError } = await supabase.from('sync_logs').insert({
      synced_at: new Date().toISOString(),
      success_count: results.length,
      error_count: errors.length,
      details: { 
        type: 'weather_sync',
        results, 
        errors 
      }
    })

    if (logError) {
      console.error('Failed to log sync result:', logError)
    }

    const summary = {
      message: 'Weather sync completed',
      success_count: results.length,
      error_count: errors.length,
      total_stations: stations.length,
      synced_at: new Date().toISOString()
    }

    console.log('Weather sync completed:', summary)

    return new Response(
      JSON.stringify({ 
        ...summary,
        details: { results, errors }
      }),
      { 
        status: errors.length > 0 && results.length === 0 ? 500 : 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (e) {
    console.error('Unexpected error in sync-weather:', e)
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(e) }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
