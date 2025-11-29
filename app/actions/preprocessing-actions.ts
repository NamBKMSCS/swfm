"use server"

import { revalidatePath } from "next/cache"

export interface PreprocessingConfig {
  method_id: string
  enabled: boolean
  config: Record<string, any>
}

export async function getPreprocessingConfigs(): Promise<PreprocessingConfig[]> {
  // Mock data - in a real app this would come from DB
  return [
    {
      method_id: "outlier",
      enabled: true,
      config: {
        method: { label: "Detection Method", value: "zscore" },
        threshold: { label: "Sensitivity (σ)", value: 2.5, min: 1, max: 5, step: 0.5 }
      }
    },
    {
      method_id: "missing",
      enabled: true,
      config: {
        method: { label: "Fill Method", value: "linear-interpolation" }
      }
    }
  ]
}

export async function savePreprocessingConfig(methodId: string, enabled: boolean, parameters: any) {
  // Mock update
  console.log(`Saving config for ${methodId}:`, { enabled, parameters })
  
  // In a real app, we would save to DB here
  // await db.preprocessingConfigs.upsert({
  //   where: { method_id: methodId },
  //   update: { enabled, config: parameters },
  //   create: { method_id: methodId, enabled, config: parameters }
  // })

  revalidatePath('/admin/preprocessing')
  return { success: true }
}

export async function runPreprocessing() {
  // Mock run
  console.log("Running preprocessing pipeline...")
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { success: true, message: "Preprocessing completed successfully" }
}
