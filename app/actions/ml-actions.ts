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
