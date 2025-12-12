"use server"

import { createClient } from "@/lib/supabase/server"

export interface DashboardMetrics {
  activeStations: number
  floodAlerts: number
  avgWaterLevel: number | null
  rainfall24h: number | null
}

/**
 * Get aggregated dashboard metrics from the database
 * - Active stations count
 * - Flood alerts (stations where water_level > alarm_level)
 * - Average water level across all stations
 * - Total rainfall in last 24 hours
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()
  
  // Get active stations count
  const { count: stationCount, error: stationError } = await supabase
    .from('stations')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
  
  if (stationError) {
    console.error('Error fetching station count:', stationError)
  }

  // Get stations with alarm/flood levels for alert calculation
  const { data: stationsWithLevels, error: levelsError } = await supabase
    .from('stations')
    .select('id, name, alarm_level, flood_level')
    .eq('is_deleted', false)
    .not('alarm_level', 'is', null)
  
  if (levelsError) {
    console.error('Error fetching station levels:', levelsError)
  }

  // Get latest measurements for each station (last 24 hours)
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  
  const { data: recentMeasurements, error: measurementsError } = await supabase
    .from('station_measurements')
    .select('station_id, water_level, rainfall_24h')
    .gte('measured_at', yesterday.toISOString())
    .order('measured_at', { ascending: false })
  
  if (measurementsError) {
    console.error('Error fetching measurements:', measurementsError)
  }

  // Calculate flood alerts
  let floodAlerts = 0
  if (stationsWithLevels && recentMeasurements) {
    const latestByStation = new Map<number, { water_level: number | null }>()
    
    // Get latest measurement per station
    recentMeasurements.forEach(m => {
      if (!latestByStation.has(m.station_id)) {
        latestByStation.set(m.station_id, { water_level: m.water_level })
      }
    })
    
    // Count stations where water_level > alarm_level
    stationsWithLevels.forEach(station => {
      const measurement = latestByStation.get(station.id)
      if (measurement?.water_level && station.alarm_level) {
        if (measurement.water_level > station.alarm_level) {
          floodAlerts++
        }
      }
    })
  }

  // Calculate average water level
  let avgWaterLevel: number | null = null
  if (recentMeasurements && recentMeasurements.length > 0) {
    const waterLevels = recentMeasurements
      .map(m => m.water_level)
      .filter((wl): wl is number => wl !== null)
    
    if (waterLevels.length > 0) {
      avgWaterLevel = Math.round(
        (waterLevels.reduce((sum, wl) => sum + wl, 0) / waterLevels.length) * 10
      ) / 10
    }
  }

  // Calculate total rainfall in last 24h (average across stations)
  let rainfall24h: number | null = null
  if (recentMeasurements && recentMeasurements.length > 0) {
    const rainfallValues = recentMeasurements
      .map(m => m.rainfall_24h)
      .filter((r): r is number => r !== null && r > 0)
    
    if (rainfallValues.length > 0) {
      rainfall24h = Math.round(
        rainfallValues.reduce((sum, r) => sum + r, 0) / rainfallValues.length
      )
    }
  }

  return {
    activeStations: stationCount || 0,
    floodAlerts,
    avgWaterLevel,
    rainfall24h
  }
}
