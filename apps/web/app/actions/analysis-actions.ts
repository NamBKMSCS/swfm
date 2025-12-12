"use server"

import { createClient } from "@/lib/supabase/server"

export async function getEvaluationMetrics() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('model_performance')
    .select('*')
    .order('evaluated_at', { ascending: false })

  if (error) {
    console.error("Error fetching evaluation metrics:", error)
    return []
  }

  return data
}
