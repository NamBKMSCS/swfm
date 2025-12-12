"use server"

import { revalidatePath } from "next/cache"

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000"

export interface PreprocessingConfig {
  id: string
  method_id: string
  enabled: boolean
  config: Record<string, any>
  updated_at?: string
}

export interface PreprocessingResponse {
  status: string
  message: string
  station_id: number
  records_processed: number
  features_generated: number
  prediction_horizons: number[]
  configs_used: string[]
  execution_time_seconds: number
  sample_data?: Array<Record<string, any>>
  data_summary: {
    initial_records: number
    final_records: number
    records_removed: number
    date_range: {
      start: string
      end: string
    }
    feature_count: number
    target_count: number
    missing_values: number
    features: string[]
  }
}

export async function getPreprocessingConfigs(): Promise<PreprocessingConfig[]> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/configs`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch configs: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching preprocessing configs:", error)
    throw error
  }
}

export async function getPreprocessingConfig(methodId: string): Promise<PreprocessingConfig> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/configs/${methodId}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching config for ${methodId}:`, error)
    throw error
  }
}

export async function updatePreprocessingConfig(
  methodId: string,
  enabled?: boolean,
  config?: Record<string, any>
): Promise<PreprocessingConfig> {
  try {
    const updateData: any = { method_id: methodId }
    
    if (enabled !== undefined) {
      updateData.enabled = enabled
    }
    
    if (config !== undefined) {
      updateData.config = config
    }

    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/configs/${methodId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `Failed to update config: ${response.statusText}`)
    }

    const data = await response.json()
    revalidatePath("/preprocessing")
    return data
  } catch (error) {
    console.error(`Error updating config for ${methodId}:`, error)
    throw error
  }
}

export async function runPreprocessing(
  stationId: number,
  startDate?: string,
  endDate?: string,
  predictionHorizons: number[] = [15, 30, 45, 60, 90]
): Promise<PreprocessingResponse> {
  try {
    const requestBody: any = {
      station_id: stationId,
      prediction_horizons: predictionHorizons,
    }

    if (startDate) {
      requestBody.start_date = startDate
    }

    if (endDate) {
      requestBody.end_date = endDate
    }

    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/preprocess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `Preprocessing failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error running preprocessing:", error)
    throw error
  }
}

export async function getPreprocessingFeatures() {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/features/list`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch features: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching preprocessing features:", error)
    throw error
  }
}

export async function getPreprocessingPipelineSummary() {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/preprocessing/pipeline/summary`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline summary: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching pipeline summary:", error)
    throw error
  }
}
