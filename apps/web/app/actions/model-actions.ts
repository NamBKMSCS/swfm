"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveModelConfig(stationName: string, modelType: string, config: any) {
  const supabase = await createClient()
  
  // Get station ID
  const { data: station } = await supabase
    .from('stations')
    .select('id')
    .eq('name', stationName)
    .single()
    
  if (!station) throw new Error("Station not found")

  const { error } = await supabase
    .from('station_model_configs')
    .upsert({
      station_id: station.id,
      model_type: modelType,
      config,
      updated_at: new Date().toISOString()
    })

  if (error) throw new Error(error.message)
  revalidatePath('/tune')
}

export async function getModelConfig(stationName: string, modelType: string) {
  const supabase = await createClient()
  
  const { data: station } = await supabase
    .from('stations')
    .select('id')
    .eq('name', stationName)
    .single()
    
  if (!station) return null

  const { data } = await supabase
    .from('station_model_configs')
    .select('config')
    .eq('station_id', station.id)
    .eq('model_type', modelType)
    .single()

  return data?.config || null
}

export async function savePreprocessingConfig(methodId: string, enabled: boolean, config: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('preprocessing_configs')
    .upsert({
      method_id: methodId,
      enabled,
      config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'method_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/preprocessing')
}

export async function getPreprocessingConfigs() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('preprocessing_configs')
    .select('*')

  if (error) {
    console.error("Error fetching preprocessing configs:", error)
    return []
  }

  return data
}
