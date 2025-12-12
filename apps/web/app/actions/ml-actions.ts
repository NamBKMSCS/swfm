/**
 * ML Service Actions - Server-side API calls to the ML prediction service
 */
"use server"

// ML Service URL from environment
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

export interface MLModel {
  name: string
  version: string
  stage: string
  run_id: string
  created_at: string
  description?: string
  accuracy?: number
  timestamp?: string
  data_shape?: string
  scaler?: string
}

export interface ForecastPoint {
  timestamp: string
  value: number
  lower_bound?: number
  upper_bound?: number
}

export interface PredictionResult {
  success: boolean
  model_name: string
  model_version: string
  station_id: number
  generated_at: string
  horizon_hours: number
  forecasts: ForecastPoint[]
}

export interface ModelUploadResult {
  success: boolean
  model_name: string
  version: string
  run_id: string
  message: string
}

/**
 * Get feature importance from latest trained models
 */
export async function getFeatureImportance() {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/evaluation/feature-importance`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch feature importance')
      return []
    }
    
    const data = await response.json()
    return data.features || []
  } catch (error) {
    console.error('Error fetching feature importance:', error)
    return []
  }
}

/**
 * Get all registered ML models
 */
export async function getMLModels(): Promise<MLModel[]> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.error('Failed to fetch models:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error('Error fetching ML models:', error)
    return []
  }
}

/**
 * Get all versions of a specific model
 */
export async function getModelVersions(modelName: string): Promise<{
  model_name: string
  versions: Array<{
    version: string
    stage: string
    run_id: string
    status: string
    created_at: string
  }>
}> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/${modelName}/versions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model versions: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching model versions:', error)
    throw error
  }
}

/**
 * Upload a PKL model file to the ML service
 */
export async function uploadMLModel(formData: FormData): Promise<ModelUploadResult> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - let browser set it with boundary for multipart
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to upload model')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error uploading model:', error)
    throw error
  }
}

/**
 * Generate predictions using a registered model
 */
export async function getPrediction(
  modelName: string,
  stationId: number,
  horizonHours: number = 24,
  inputData?: number[]
): Promise<PredictionResult> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict/${modelName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: stationId,
        horizon_hours: horizonHours,
        input_data: inputData
      }),
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Prediction failed')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error generating prediction:', error)
    throw error
  }
}

/**
 * Promote a model version to a stage (Production, Staging, etc.)
 */
export async function promoteModel(
  modelName: string,
  version: string,
  stage: string = 'Production'
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${ML_SERVICE_URL}/models/${modelName}/promote/${version}?stage=${stage}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to promote model')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error promoting model:', error)
    throw error
  }
}

/**
 * Delete a registered model
 */
export async function deleteMLModel(modelName: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/models/${modelName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete model')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error deleting model:', error)
    throw error
  }
}

/**
 * Check ML service health
 */
export async function checkMLServiceHealth(): Promise<{ status: string; mlflow: string }> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return { status: 'unhealthy', mlflow: 'unreachable' }
    }
    
    return await response.json()
  } catch {
    return { status: 'unreachable', mlflow: 'unknown' }
  }
}

// Training Types
export interface TrainingRequest {
  station_id: number | null // null = unified model (all stations)
  start_date?: string
  end_date?: string
  prediction_horizons?: number[]
  model_types?: string[]
  test_size?: number
  use_time_split?: boolean
  ridge_alpha?: number
  register_model?: boolean
  model_stage?: string
}

export interface ModelMetrics {
  rmse: number
  mae: number
  r2: number
}

export interface HorizonModelResult {
  model_type: string
  horizon_minutes: number
  train_metrics: ModelMetrics
  test_metrics: ModelMetrics
  training_time_seconds: number
  mlflow_run_id: string
}

export interface TrainingResponse {
  success: boolean
  message: string
  station_id: number
  station_name?: string
  total_samples: number
  train_samples: number
  test_samples: number
  features_count: number
  feature_names: string[]
  results: HorizonModelResult[]
  experiment_id: string
  experiment_name: string
  best_models: Record<number, { model_type: string; rmse: number; run_id: string }>
  total_training_time_seconds: number
  preprocessing_time_seconds: number
}

export interface TrainingStatus {
  status: 'idle' | 'training' | 'completed' | 'failed'
  current_model?: string
  current_horizon?: number
  progress: number
  message: string
}

/**
 * Train models for a specific station
 */
export async function trainModels(request: TrainingRequest): Promise<TrainingResponse> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/training/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Training failed')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error training models:', error)
    throw error
  }
}

/**
 * Get training status
 */
export async function getTrainingStatus(): Promise<TrainingStatus> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/training/status`, {
      method: 'GET',
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to get training status')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting training status:', error)
    throw error
  }
}

/**
 * Get all models trained for a station
 */
export async function getStationModels(stationId: number): Promise<{
  station_id: number
  experiment_name: string
  models_by_horizon: Record<number, Array<{
    run_id: string
    model_type: string
    horizon_minutes: number
    test_rmse: number
    test_mae: number
    test_r2: number
    training_time: number
    start_time: number
  }>>
  total_models: number
}> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/training/models/${stationId}`, {
      method: 'GET',
      cache: 'no-store'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get station models')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting station models:', error)
    throw error
  }
}

/**
 * Train models for all stations (batch training)
 */
export async function trainAllStations(
  startDate?: string,
  endDate?: string,
  predictionHorizons: number[] = [15, 30, 45, 60],
  modelTypes: string[] = ["linear", "ridge"],
  testSize: number = 0.2
): Promise<{
  success: boolean
  message: string
  total_stations: number
  successful: number
  failed: number
  results: Array<{
    station_id: number
    station_name: string
    success: boolean
    models_trained?: number
    training_time?: number
    error?: string
  }>
}> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/training/train-all-stations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        prediction_horizons: predictionHorizons,
        model_types: modelTypes,
        test_size: testSize
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Batch training failed')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error in batch training:', error)
    throw error
  }
}

/**
 * Generate forecasts using trained models and save to database
 */
export async function generateForecasts(
  stationId: number | null,
  horizonsMinutes: number[] = [15, 30, 45, 60],
  saveToDb: boolean = true
): Promise<{
  success: boolean
  message: string
  station_id: number | null
  forecasts_generated: number
  forecasts: any[]
}> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict/generate-forecasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: stationId,
        horizons_minutes: horizonsMinutes,
        save_to_db: saveToDb
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Forecast generation failed')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error generating forecasts:', error)
    throw error
  }
}

/**
 * Clean up old or stale forecasts from the database
 * Removes forecasts older than the specified hours
 */
export async function cleanupOldForecasts(hoursOld: number = 24): Promise<{
  success: boolean
  message: string
  deleted_count: number
}> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld)
    
    const { data, error } = await supabase
      .from('forecasts')
      .delete()
      .lt('forecast_date', cutoffDate.toISOString())
      .select()
    
    if (error) {
      throw new Error(`Failed to delete old forecasts: ${error.message}`)
    }
    
    return {
      success: true,
      message: `Deleted ${data?.length || 0} old forecasts`,
      deleted_count: data?.length || 0
    }
  } catch (error) {
    console.error('Error cleaning up forecasts:', error)
    throw error
  }
}
