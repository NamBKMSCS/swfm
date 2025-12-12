"use client"

import { useState, useEffect, useMemo, useTransition, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { createColumns, MeasurementRecord } from "@/components/data/columns"
import { Plus, Upload, Download, RefreshCw, Settings, FileText } from "lucide-react"
import { getLastSyncLog, triggerManualSync, SyncLog } from "@/app/actions/sync-actions"
import { formatSyncTimeAgo } from "@/lib/utils/sync-utils"
import { toast } from "sonner"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export function DataManagementPage() {
  const [records, setRecords] = useState<MeasurementRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stations, setStations] = useState<{ id: number; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [lastSync, setLastSync] = useState<SyncLog | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Date range filter
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7) // Default to last 7 days
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedStation, setSelectedStation] = useState<string>("all")

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MeasurementRecord | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    station_id: "",
    water_level: "",
    rainfall_24h: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchStations()
    fetchLastSync()
  }, [])

  useEffect(() => {
    fetchData()
  }, [dateFrom, dateTo, selectedStation])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Build query with filters
      let query = supabase
        .from('station_measurements')
        .select(`
          id,
          station_id,
          measured_at,
          water_level,
          rainfall_24h,
          stations!inner(name)
        `, { count: 'exact' })
        .gte('measured_at', `${dateFrom}T00:00:00`)
        .lte('measured_at', `${dateTo}T23:59:59`)
        .order('measured_at', { ascending: false })

      // Filter by station if selected
      if (selectedStation !== "all") {
        query = query.eq('station_id', parseInt(selectedStation))
      }

      const { data, error, count } = await query

      if (error) throw error

      const formattedRecords: MeasurementRecord[] = (data || []).map(record => {
        const measuredDate = new Date(record.measured_at)
        return {
          id: record.id.toString(),
          station_id: record.station_id,
          station: (record.stations as any)?.name || 'Unknown',
          date: measuredDate.toLocaleDateString('en-GB'),
          time: measuredDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          water_level: record.water_level,
          rainfall_24h: record.rainfall_24h,
          source: "automated" as const,
          status: "verified" as const,
        }
      })

      setRecords(formattedRecords)
      setTotalCount(count || 0)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data records")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStations = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('stations')
        .select('id, name')
        .eq('is_deleted', false)
        .order('name')

      if (error) throw error
      setStations(data || [])
    } catch (error) {
      console.error("Error fetching stations:", error)
    }
  }

  const fetchLastSync = async () => {
    try {
      const syncLog = await getLastSyncLog()
      setLastSync(syncLog)
    } catch (error) {
      console.error("Error fetching last sync:", error)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const result = await triggerManualSync()
      if (result.success) {
        toast.success(result.message)
        fetchData()
        fetchLastSync()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to trigger sync")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEdit = (record: MeasurementRecord) => {
    setEditingRecord(record)
    setFormData({
      date: record.date.split('/').reverse().join('-'),
      time: record.time,
      station_id: record.station_id.toString(),
      water_level: record.water_level?.toString() || "",
      rainfall_24h: record.rainfall_24h?.toString() || "",
    })
    setShowAddDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('station_measurements')
        .delete()
        .eq('id', parseInt(id))

      if (error) throw error

      toast.success("Record deleted")
      fetchData()
    } catch (error) {
      console.error("Error deleting record:", error)
      toast.error("Failed to delete record")
    }
  }

  const handleVerify = async (id: string, currentStatus: string) => {
    // Toggle status (in a real app, this would update the database)
    toast.info(`Status toggled for record ${id}`)
  }

  const handleSaveRecord = async () => {
    if (!formData.station_id || !formData.water_level) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      const supabase = createClient()
      const measuredAt = new Date(`${formData.date}T${formData.time}:00`).toISOString()

      const recordData = {
        station_id: parseInt(formData.station_id),
        measured_at: measuredAt,
        water_level: parseFloat(formData.water_level),
        rainfall_24h: formData.rainfall_24h ? parseFloat(formData.rainfall_24h) : null,
      }

      if (editingRecord) {
        const { error } = await supabase
          .from('station_measurements')
          .update(recordData)
          .eq('id', parseInt(editingRecord.id))

        if (error) throw error
        toast.success("Record updated")
      } else {
        const { error } = await supabase
          .from('station_measurements')
          .insert(recordData)

        if (error) throw error
        toast.success("Record added")
      }

      setShowAddDialog(false)
      setEditingRecord(null)
      setFormData({
        date: new Date().toISOString().split("T")[0],
        time: "12:00",
        station_id: "",
        water_level: "",
        rainfall_24h: "",
      })
      fetchData()
    } catch (error) {
      console.error("Error saving record:", error)
      toast.error("Failed to save record")
    }
  }

  const handleExport = () => {
    try {
      const csvContent = [
        ["Date", "Time", "Station", "Water Level (m)", "Rainfall 24h (mm)", "Source", "Status"].join(","),
        ...records.map(r => [
          r.date,
          r.time,
          r.station,
          r.water_level?.toString() || "",
          r.rainfall_24h?.toString() || "",
          r.source,
          r.status
        ].join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `measurements_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Data exported successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',')

      // Validate headers
      if (!headers.includes("Station") || !headers.includes("Water Level (m)")) {
        toast.error("Invalid CSV format. Required columns: Station, Water Level (m)")
        return
      }

      let imported = 0
      let errors = 0
      const supabase = createClient()

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        const record: any = {}
        headers.forEach((header, idx) => {
          record[header.trim()] = values[idx]?.trim()
        })

        // Find station by name
        const station = stations.find(s => s.name.toLowerCase() === record["Station"]?.toLowerCase())
        if (!station) {
          errors++
          continue
        }

        const { error } = await supabase
          .from('station_measurements')
          .insert({
            station_id: station.id,
            measured_at: new Date(`${record["Date"]} ${record["Time"]}`).toISOString(),
            water_level: parseFloat(record["Water Level (m)"]) || null,
            rainfall_24h: parseFloat(record["Rainfall 24h (mm)"]) || null,
          })

        if (error) {
          errors++
        } else {
          imported++
        }
      }

      toast.success(`Imported ${imported} records${errors > 0 ? `, ${errors} errors` : ""}`)
      fetchData()
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import data")
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const columns = useMemo(
    () => createColumns(handleEdit, handleDelete, handleVerify),
    []
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Data Management</h1>
              <p className="text-sm text-slate-400">
                Manage measurement records • {records.length} records
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Sync Status */}
              <div className="text-right">
                <p className="text-xs text-slate-400">
                  Last sync: {lastSync ? formatSyncTimeAgo(lastSync.synced_at) : "Never"}
                </p>
                {lastSync && (
                  <p className="text-xs text-slate-500">
                    {lastSync.success_count} synced, {lastSync.error_count} errors
                  </p>
                )}
              </div>
              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">Sync Now</span>
              </Button>
              <Link href="/preprocessing">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Settings className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline">Preprocessing</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-sm whitespace-nowrap">From:</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-36 bg-slate-900 border-slate-700 text-white h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-sm whitespace-nowrap">To:</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-36 bg-slate-900 border-slate-700 text-white h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-sm whitespace-nowrap">Station:</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="All Stations" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all" className="text-slate-300">All Stations</SelectItem>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id.toString()} className="text-slate-300">
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(); d.setDate(d.getDate() - 1)
                      setDateFrom(d.toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-9"
                  >
                    1D
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(); d.setDate(d.getDate() - 7)
                      setDateFrom(d.toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-9"
                  >
                    7D
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(); d.setMonth(d.getMonth() - 1)
                      setDateFrom(d.toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-9"
                  >
                    1M
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date(); d.setMonth(d.getMonth() - 3)
                      setDateFrom(d.toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-9"
                  >
                    3M
                  </Button>
                </div>
                <div className="ml-auto text-sm text-slate-400">
                  Found <span className="text-white font-medium">{totalCount}</span> records
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Data Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Measurement Records</CardTitle>
                  <CardDescription className="text-slate-400">
                    Water level and rainfall data from monitoring stations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditingRecord(null)
                      setFormData({
                        date: new Date().toISOString().split("T")[0],
                        time: "12:00",
                        station_id: stations[0]?.id.toString() || "",
                        water_level: "",
                        rainfall_24h: "",
                      })
                      setShowAddDialog(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Record
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
                  <span className="text-slate-400">Loading data...</span>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={records}
                  searchKey="station"
                  searchPlaceholder="Filter by station..."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRecord ? "Edit Record" : "Add New Record"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingRecord ? "Update the measurement data" : "Add a new measurement record to the database"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-slate-300">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-slate-300">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station" className="text-slate-300">Station</Label>
              <Select
                value={formData.station_id}
                onValueChange={(value) => setFormData({ ...formData, station_id: value })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()} className="text-slate-300">
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="water_level" className="text-slate-300">Water Level (m)</Label>
                <Input
                  id="water_level"
                  type="number"
                  step="0.01"
                  value={formData.water_level}
                  onChange={(e) => setFormData({ ...formData, water_level: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="e.g., 8.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rainfall" className="text-slate-300">Rainfall 24h (mm)</Label>
                <Input
                  id="rainfall"
                  type="number"
                  step="0.1"
                  value={formData.rainfall_24h}
                  onChange={(e) => setFormData({ ...formData, rainfall_24h: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="e.g., 12.5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRecord}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingRecord ? "Update" : "Add"} Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
