"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
