"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface DataRecord {
  id: string
  date: string
  time: string
  station: string
  value: number
  unit: string
  source: "manual" | "automated"
  status: "verified" | "pending"
}

export async function getDataRecords(): Promise<DataRecord[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('measurements')
    .select(`
      *,
      stations (
        name
      )
    `)
    .order('measured_at', { ascending: false })

  if (error) {
    console.error("Error fetching data:", error)
    return []
  }

  return data.map((d: any) => {
    // Handle date parsing safely
    let dateStr = d.measured_at;
    let timeStr = "00:00";
    try {
        const dateObj = new Date(d.measured_at)
        dateStr = dateObj.toISOString().split('T')[0]
        timeStr = dateObj.toISOString().split('T')[1].substring(0, 5)
    } catch (e) {
        console.error("Error parsing date:", d.measured_at)
    }

    return {
      id: d.id.toString(),
      date: dateStr,
      time: timeStr,
      station: d.stations?.name || 'Unknown',
      value: d.water_level || 0,
      unit: d.unit || 'meters',
      source: d.source || 'automated',
      status: d.status || 'verified'
    }
  })
}

export async function getStations() {
    const supabase = await createClient()
    const { data } = await supabase.from('stations').select('name').order('name')
    return data?.map(s => s.name) || []
}

export async function addDataRecord(data: { date: string, time: string, station: string, value: number, unit: string }) {
    const supabase = await createClient()
    
    // Get station id
    const { data: stationData, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('name', data.station)
        .single()
        
    if (stationError || !stationData) throw new Error("Station not found")

    // Construct timestamp - assuming UTC for simplicity, but ideally should match station timezone
    const measured_at = `${data.date}T${data.time}:00Z` 

    const { error } = await supabase.from('measurements').insert({
        station_id: stationData.id,
        measured_at,
        water_level: data.value,
        unit: data.unit,
        source: 'manual',
        status: 'pending'
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function updateDataRecord(id: string, data: { date: string, time: string, station: string, value: number, unit: string }) {
     const supabase = await createClient()
    
    // Get station id
    const { data: stationData, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('name', data.station)
        .single()
        
    if (stationError || !stationData) throw new Error("Station not found")

    const measured_at = `${data.date}T${data.time}:00Z`

    const { error } = await supabase.from('measurements').update({
        station_id: stationData.id,
        measured_at,
        water_level: data.value,
        unit: data.unit
    }).eq('id', parseInt(id))

    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function deleteDataRecord(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('measurements').delete().eq('id', parseInt(id))
    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function verifyDataRecord(id: string, status: 'verified' | 'pending') {
    const supabase = await createClient()
    const { error } = await supabase.from('measurements').update({ status }).eq('id', parseInt(id))
    if (error) throw new Error(error.message)
    revalidatePath('/')
}
