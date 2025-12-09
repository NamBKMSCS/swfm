"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Stations } from "@/lib/supabase/schema"

// View-model extending Stations with computed fields
export type StationWithStatus = Stations & {
  waterLevel: number
  status: 'normal' | 'warning' | 'critical'
  alarm_level: number | null
  flood_level: number | null
}

export async function getStations(): Promise<StationWithStatus[]> {
  const supabase = await createClient()
  
  const { data: stations, error } = await supabase
    .from('stations')
    .select(`
      id,
      name,
      station_code,
      latitude,
      longitude,
      country,
      alarm_level,
      flood_level
    `)
    .order('name')

  if (error) {
    console.error("Error fetching stations:", error)
    return []
  }

  // Fetch latest measurement for each station to determine status
  const stationsWithStatus = await Promise.all(stations.map(async (station) => {
    const { data: measurement } = await supabase
      .from('station_measurements')
      .select('water_level')
      .eq('station_id', station.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single()

    const waterLevel = measurement?.water_level || 0
    let status: 'normal' | 'warning' | 'critical' = 'normal'

    // Use station-specific thresholds if available, otherwise use defaults
    const floodLevel = station.flood_level ?? 4.5
    const alarmLevel = station.alarm_level ?? 3.5

    if (waterLevel >= floodLevel) status = 'critical'
    else if (waterLevel >= alarmLevel) status = 'warning'

    return {
      ...station,
      country: station.country ?? '',
      waterLevel,
      status,
      alarm_level: station.alarm_level,
      flood_level: station.flood_level
    } as StationWithStatus
  }))

  return stationsWithStatus
}

export async function getStationStatus(stationId: number) {
  const supabase = await createClient()
  
  const { data: measurement } = await supabase
    .from('station_measurements')
    .select('water_level')
    .eq('station_id', stationId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  return measurement?.water_level || 0
}
