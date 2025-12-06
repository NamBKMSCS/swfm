"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface SyncLog {
  id: string
  synced_at: string
  success_count: number
  error_count: number
  details: {
    results: Array<{ station: string; success: boolean }>
    errors: Array<{ station: string; error: string }>
  }
}

/**
 * Get the last sync log entry
 * Used to display "Last sync: X minutes ago" in the dashboard
 */
export async function getLastSyncLog(): Promise<SyncLog | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error fetching last sync log:', error)
    return null
  }
  
  return data as SyncLog
}

/**
 * Get sync history for the last N days
 */
export async function getSyncHistory(days: number = 7): Promise<SyncLog[]> {
  const supabase = await createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .gte('synced_at', startDate.toISOString())
    .order('synced_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching sync history:', error)
    return []
  }
  
  return data as SyncLog[]
}

/**
 * Manually trigger a sync by calling the Edge Function
 * Requires Supabase URL and anon key to be configured
 */
export async function triggerManualSync(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: 'Supabase configuration is missing'
      }
    }
    
    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-measurements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Sync failed',
        details: result
      }
    }
    
    // Revalidate dashboard data after sync
    revalidatePath('/')
    revalidatePath('/data')
    
    return {
      success: true,
      message: `Synced ${result.success_count} stations successfully`,
      details: result
    }
    
  } catch (error) {
    console.error('Error triggering manual sync:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

