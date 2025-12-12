"use server"

import { createClient } from "@/lib/supabase/server"

// Type for weather measurement data
export type WeatherData = {
  id: number
  station_id: number
  measured_at: string
  temperature: number | null
  temp_min: number | null
  temp_max: number | null
  feels_like: number | null
  pressure: number | null
  humidity: number | null
  wind_speed: number | null
  wind_deg: number | null
  rain_1h: number | null
  clouds: number | null
  visibility: number | null
  weather_main: string | null
  weather_description: string | null
}

/**
 * Get the latest weather measurement for a specific station
 */
export async function getLatestWeatherForStation(stationId: number): Promise<WeatherData | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('weather_measurements')
    .select('*')
    .eq('station_id', stationId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // PGRST116 = No rows found
    if (error.code !== 'PGRST116') {
      console.error("Error fetching weather data:", error)
    }
    return null
  }

  return data as WeatherData
}

/**
 * Get weather history for a station over specified number of days
 */
export async function getWeatherHistory(stationId: number, days: number = 7): Promise<WeatherData[]> {
  const supabase = await createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('weather_measurements')
    .select('*')
    .eq('station_id', stationId)
    .gte('measured_at', startDate.toISOString())
    .order('measured_at', { ascending: false })

  if (error) {
    console.error("Error fetching weather history:", error)
    return []
  }

  return (data as WeatherData[]) || []
}

// Weather forecast types
export type WeatherForecastHorizon = {
  minutes_ahead: number
  timestamp: string
  weather: {
    temperature: number
    humidity: number
    pressure: number
    wind_speed: number
    wind_direction: number
    cloud_cover: number
    rainfall_1h: number
    rainfall_3h: number
    rainfall_6h: number
    rainfall_12h: number
    rainfall_24h: number
    pressure_diff_3h: number
  }
}

export type WeatherForecast = {
  location: {
    latitude: number
    longitude: number
    timezone: string
    elevation: number
  }
  forecasts: {
    [key: string]: WeatherForecastHorizon
  }
  units: {
    temperature: string
    pressure: string
    wind_speed: string
    precipitation: string
  }
}

/**
 * Get weather forecast from ML service for a station
 * Uses Open-Meteo API through ML service
 */
export async function getWeatherForecast(
  latitude: number,
  longitude: number,
  minutes: number[] = [0, 15, 30, 45, 60]
): Promise<WeatherForecast | null> {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001"
    const minutesParam = minutes.map(m => `minutes=${m}`).join('&')
    const url = `${ML_SERVICE_URL}/weather/forecast?latitude=${latitude}&longitude=${longitude}&${minutesParam}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't cache weather data
    })

    if (!response.ok) {
      console.error(`Weather forecast API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data as WeatherForecast
  } catch (error) {
    console.error("Error fetching weather forecast:", error)
    return null
  }
}

