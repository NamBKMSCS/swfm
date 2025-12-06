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
 */
export async function getStationChartData(stationId: number, days: number) {
  const supabase = await createClient()
  
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  // Get historical measurements
  const { data: measurements, error: measurementsError } = await supabase
    .from('measurements')
    .select('measured_at, water_level')
    .eq('station_id', stationId)
    .gte('measured_at', startDate.toISOString())
    .lte('measured_at', endDate.toISOString())
    .order('measured_at', { ascending: true })
  
  if (measurementsError) {
    console.error('Error fetching measurements:', measurementsError)
    return { measurements: [], forecasts: [] }
  }
  
  // Get forecast data (future predictions)
  const { data: forecasts, error: forecastsError } = await supabase
    .from('forecasts')
    .select('target_date, water_level, model_id')
    .eq('station_id', stationId)
    .gte('target_date', new Date().toISOString())
    .order('target_date', { ascending: true })
    .limit(Math.min(days, 7)) // Limit to next 7 days max
  
  if (forecastsError) {
    console.error('Error fetching forecasts:', forecastsError)
    return { measurements: measurements || [], forecasts: [] }
  }
  
  return {
    measurements: measurements || [],
    forecasts: forecasts || []
  }
}

/**
 * Get forecast comparison data for multiple models
 */
export async function getForecastComparisonData(stationId: number) {
  const supabase = await createClient()
  
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 10)
  
  const { data, error } = await supabase
    .from('forecasts')
    .select(`
      target_date,
      water_level,
      model_id,
      model_configs!inner(name, algorithm)
    `)
    .eq('station_id', stationId)
    .gte('target_date', new Date().toISOString())
    .lte('target_date', futureDate.toISOString())
    .order('target_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching forecast comparison:', error)
    return []
  }
  
  return data || []
}

/**
 * Get accuracy metrics by station
 * Returns hardcoded mock data until model performance data is populated
 */
export async function getAccuracyByStation() {
  // TODO: This will work once model_performance table is populated and schema is updated
  // For now, return mock data to avoid errors
  return [
    { station: "Chiang Khong", accuracy: 94.2 },
    { station: "Nong Khai", accuracy: 92.8 },
    { station: "Vientiane", accuracy: 89.5 },
    { station: "Pakse", accuracy: 88.2 },
    { station: "Khone Phapheng", accuracy: 91.5 },
  ]
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
  const avgAccuracy = performanceData && performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + (p.accuracy || 0), 0) / performanceData.length
    : 0
  
  const avgRmse = performanceData && performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + (p.rmse || 0), 0) / performanceData.length
    : 0
  
  const avgR2 = performanceData && performanceData.length > 0
    ? performanceData.reduce((sum, p) => sum + (p.r2 || 0), 0) / performanceData.length
    : 0
  
  return {
    avgAccuracy: Math.round(avgAccuracy * 10) / 10,
    avgPrecision: Math.round(avgR2 * 1000) / 1000,
    avgRmse: Math.round(avgRmse * 1000) / 1000,
    activeStations: stationCount || 0
  }
}
