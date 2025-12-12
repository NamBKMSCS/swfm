"use server"

import { createClient } from "@/lib/supabase/server"
import { getPrediction } from "@/app/actions/ml-actions"

/**
 * Get ML predictions for chart display
 * Fetches from ML service and transforms to chart format
 */
export async function getMLPredictionForChart(
  stationId: number,
  modelName: string,
  horizonHours: number = 24
) {
  try {
    const result = await getPrediction(modelName, stationId, horizonHours)
    
    if (!result.success) {
      return { forecasts: [], error: "Prediction failed" }
    }
    
    // Transform to chart format
    const forecasts = result.forecasts.map(f => ({
      target_date: f.timestamp,
      water_level: f.value,
      lower_bound: f.lower_bound,
      upper_bound: f.upper_bound,
    }))
    
    return { 
      forecasts, 
      modelName: result.model_name,
      modelVersion: result.model_version,
      error: null 
    }
  } catch (error) {
    console.error("Error fetching ML prediction:", error)
    return { forecasts: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Get water level chart data for a specific station
 * Includes historical measurements and forecasts
 * 
 * Data aggregation strategy:
 * - 1 day: Raw 15-min intervals (~96 points)
 * - 7 days: Hourly averages (~168 points)
 * - 14+ days: Daily averages (14-180 points)
 */
export async function getStationChartData(stationId: number, days: number) {
  const supabase = await createClient()
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  let measurements: any[] = []
  
  if (days <= 1) {
    // For 1 day: fetch raw 15-min data
    const { data, error } = await supabase
      .from('station_measurements')
      .select('measured_at, water_level')
      .eq('station_id', stationId)
      .gte('measured_at', startDate.toISOString())
      .lte('measured_at', endDate.toISOString())
      .order('measured_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching measurements:', error)
      return { measurements: [], forecasts: [] }
    }
    measurements = data || []
  } else if (days <= 7) {
    // For 7 days: aggregate to hourly averages using RPC or client-side
    const { data, error } = await supabase
      .from('station_measurements')
      .select('measured_at, water_level')
      .eq('station_id', stationId)
      .gte('measured_at', startDate.toISOString())
      .lte('measured_at', endDate.toISOString())
      .order('measured_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching measurements:', error)
      return { measurements: [], forecasts: [] }
    }
    
    // Aggregate to hourly on the client side
    measurements = aggregateToHourly(data || [])
  } else {
    // For 14+ days: aggregate to daily averages
    const { data, error } = await supabase
      .from('station_measurements')
      .select('measured_at, water_level')
      .eq('station_id', stationId)
      .gte('measured_at', startDate.toISOString())
      .lte('measured_at', endDate.toISOString())
      .order('measured_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching measurements:', error)
      return { measurements: [], forecasts: [] }
    }
    
    // Aggregate to daily on the client side
    measurements = aggregateToDaily(data || [])
  }
  
  // Get forecast data (including past predictions to see model performance)
  // Filter to show forecasts from the time range we're viewing
  const { data: forecasts, error: forecastsError } = await supabase
    .from('forecasts')
    .select('target_date, water_level, forecast_date')
    .eq('station_id', stationId)
    .gte('target_date', startDate.toISOString())
    .lte('target_date', endDate.toISOString())
    .order('target_date', { ascending: true })
  
  if (forecastsError) {
    console.error('Error fetching forecasts:', forecastsError)
    return { measurements: measurements, forecasts: [] }
  }
  
  console.log(`📊 Fetched ${forecasts?.length || 0} forecasts for station ${stationId}`)
  if (forecasts && forecasts.length > 0) {
    console.log('First forecast:', forecasts[0])
    console.log('Last forecast:', forecasts[forecasts.length - 1])
  }
  
  return {
    measurements: measurements,
    forecasts: forecasts || []
  }
}

/**
 * Aggregate measurements to hourly averages
 */
function aggregateToHourly(data: { measured_at: string; water_level: number | null }[]) {
  const hourlyMap = new Map<string, { sum: number; count: number }>()
  
  for (const item of data) {
    if (item.water_level === null) continue
    
    const date = new Date(item.measured_at)
    // Create hour key: YYYY-MM-DD-HH
    const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`
    
    if (hourlyMap.has(hourKey)) {
      const existing = hourlyMap.get(hourKey)!
      existing.sum += item.water_level
      existing.count += 1
    } else {
      hourlyMap.set(hourKey, { sum: item.water_level, count: 1 })
    }
  }
  
  // Convert map to array with averaged values
  const result: { measured_at: string; water_level: number }[] = []
  for (const [hourKey, { sum, count }] of hourlyMap) {
    const [year, month, day, hour] = hourKey.split('-')
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), 30, 0)
    result.push({
      measured_at: date.toISOString(),
      water_level: Math.round((sum / count) * 100) / 100
    })
  }
  
  return result.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
}

/**
 * Aggregate measurements to daily averages
 */
function aggregateToDaily(data: { measured_at: string; water_level: number | null }[]) {
  const dailyMap = new Map<string, { sum: number; count: number }>()
  
  for (const item of data) {
    if (item.water_level === null) continue
    
    const date = new Date(item.measured_at)
    // Create day key: YYYY-MM-DD
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    
    if (dailyMap.has(dayKey)) {
      const existing = dailyMap.get(dayKey)!
      existing.sum += item.water_level
      existing.count += 1
    } else {
      dailyMap.set(dayKey, { sum: item.water_level, count: 1 })
    }
  }
  
  // Convert map to array with averaged values
  const result: { measured_at: string; water_level: number }[] = []
  for (const [dayKey, { sum, count }] of dailyMap) {
    const [year, month, day] = dayKey.split('-')
    // Set time to noon for daily aggregates
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
    result.push({
      measured_at: date.toISOString(),
      water_level: Math.round((sum / count) * 100) / 100
    })
  }
  
  return result.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
}

/**
 * Get accuracy metrics by station
 * Returns R² scores converted to percentage by station
 * Shows all stations, even those without performance data
 */
export async function getAccuracyByStation() {
  const supabase = await createClient()
  
  // Get all stations first
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  
  if (stationsError) {
    console.error('Error fetching stations:', stationsError)
    return []
  }
  
  if (!stations || stations.length === 0) {
    return []
  }
  
  // Get model performance data for all stations
  const { data: performanceData, error: perfError } = await supabase
    .from('model_performance')
    .select('r2, station_id, evaluated_at')
    .order('evaluated_at', { ascending: false })
  
  if (perfError) {
    console.error('Error fetching performance data:', perfError)
  }
  
  // Group performance by station and get the best R² for each
  const stationPerformanceMap = new Map<number, number>()
  
  if (performanceData && performanceData.length > 0) {
    for (const item of performanceData) {
      if (item.station_id && item.r2 !== null) {
        if (!stationPerformanceMap.has(item.station_id) || 
            (stationPerformanceMap.get(item.station_id)! < item.r2)) {
          stationPerformanceMap.set(item.station_id, item.r2)
        }
      }
    }
  }
  
  // Map all stations with their performance data
  return stations.map(station => {
    const r2 = stationPerformanceMap.get(station.id)
    return {
      station: station.name,
      accuracy: r2 !== undefined ? Math.round(r2 * 100 * 10) / 10 : 0
    }
  }).filter(item => item.accuracy > 0) // Only show stations with data
}

/**
 * Get error distribution over forecast days
 */
export async function getErrorDistribution(days: number = 10) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('model_performance')
    .select('rmse, evaluated_at')
    .order('evaluated_at', { ascending: false })
    .limit(days)
  
  if (error) {
    console.error('Error fetching error distribution:', error)
    return []
  }
  
  // Transform to chart format
  return (data || []).map((item, index) => ({
    day: index + 1,
    error: item.rmse || 0
  })).reverse()
}

/**
 * Get aggregated evaluation metrics
 */
export async function getAggregatedEvaluationMetrics() {
  const supabase = await createClient()
  
  // Get latest model performance records
  const { data: performanceData, error: perfError } = await supabase
    .from('model_performance')
    .select('accuracy, rmse, mae, r2')
    .order('evaluated_at', { ascending: false })
    .limit(20)
  
  if (perfError) {
    console.error('Error fetching performance data:', perfError)
  }
  
  // Get active stations count
  const { count: stationCount, error: stationError } = await supabase
    .from('stations')
    .select('*', { count: 'exact', head: true })
    .eq('is_deleted', false)
  
  if (stationError) {
    console.error('Error fetching station count:', stationError)
  }
  
  // Calculate averages
  const avgR2 = performanceData && performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + (p.r2 || 0), 0) / performanceData.length
    : 0
  
  const avgAccuracy = avgR2 * 100 // Convert R² to percentage
  
  const avgRmse = performanceData && performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + (p.rmse || 0), 0) / performanceData.length
    : 0
  
  return {
    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
    avgPrecision: Math.round(avgR2 * 1000) / 1000,
    avgRmse: Math.round(avgRmse * 1000) / 1000,
    activeStations: stationCount || 0
  }
}
