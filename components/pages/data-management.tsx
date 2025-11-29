"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, Upload, Download, Filter, Trash2, Edit2, CheckCircle2, AlertCircle, Calendar as CalendarIcon, RefreshCw, Settings } from "lucide-react"
import { getDataRecords, addDataRecord, updateDataRecord, deleteDataRecord, verifyDataRecord, getStations, DataRecord } from "@/app/actions/data-actions"
import { toast } from "sonner"
import Link from "next/link"

export function DataManagementPage() {
  const [records, setRecords] = useState<DataRecord[]>([])
  const [stations, setStations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    station: "",
    value: "",
    unit: "meters",
  })

  useEffect(() => {
    fetchData()
    fetchStations()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await getDataRecords()
      setRecords(data)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to fetch data records")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStations = async () => {
    try {
      const data = await getStations()
      setStations(data)
      if (data.length > 0 && !formData.station) {
        setFormData(prev => ({ ...prev, station: data[0] }))
      }
    } catch (error) {
      console.error("Error fetching stations:", error)
    }
  }

  const handleAddRecord = () => {
    if (formData.date && formData.time && formData.station && formData.value) {
      startTransition(async () => {
        try {
          const payload = {
            date: formData.date,
            time: formData.time,
            station: formData.station,
            value: parseFloat(formData.value),
            unit: formData.unit
          }

          if (editingId) {
            await updateDataRecord(editingId, payload)
            toast.success("Record updated successfully")
            setEditingId(null)
          } else {
            await addDataRecord(payload)
            toast.success("Record added successfully")
          }
          
          setFormData({
            date: new Date().toISOString().split("T")[0],
            time: "12:00",
            station: stations[0] || "",
            value: "",
            unit: "meters",
          })
          setShowAddForm(false)
          fetchData()
        } catch (error) {
          console.error("Error saving record:", error)
          toast.error("Failed to save record")
        }
      })
    } else {
      toast.error("Please fill in all fields")
    }
  }

  const handleEditRecord = (record: DataRecord) => {
    setFormData({
      date: record.date,
      time: record.time,
      station: record.station,
      value: record.value.toString(),
      unit: record.unit,
    })
    setEditingId(record.id)
    setShowAddForm(true)
  }

  const handleDeleteRecord = (id: string) => {
    if (confirm("Are you sure you want to delete this data record?")) {
      startTransition(async () => {
        try {
          await deleteDataRecord(id)
          toast.success("Record deleted")
          fetchData()
        } catch (error) {
          console.error("Error deleting record:", error)
          toast.error("Failed to delete record")
        }
      })
    }
  }

  const handleVerifyRecord = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "verified" ? "pending" : "verified"
    startTransition(async () => {
      try {
        await verifyDataRecord(id, newStatus)
        toast.success(`Record marked as ${newStatus}`)
        fetchData()
      } catch (error) {
        console.error("Error verifying record:", error)
        toast.error("Failed to update verification status")
      }
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Data Management</h2>
            <p className="text-slate-400">Manage and verify water level data records</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Data Collection Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-xs text-slate-400">Total Records</p>
                  <p className="text-2xl font-bold text-white mt-2">{records.length}</p>
                </div>
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
                  <p className="text-xs text-slate-400">Verified</p>
                  <p className="text-2xl font-bold text-green-300 mt-2">
                    {records.filter((r) => r.status === "verified").length}
                  </p>
                </div>
                <div className="bg-orange-900/20 rounded-lg p-4 border border-orange-700/50">
                  <p className="text-xs text-slate-400">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-300 mt-2">
                    {records.filter((r) => r.status === "pending").length}
                  </p>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
                  <p className="text-xs text-slate-400">Auto-Synced</p>
                  <p className="text-2xl font-bold text-blue-300 mt-2">
                    {records.filter((r) => r.source === "automated").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-sync Info */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300">Automated Data Synchronization</p>
              <p className="text-xs text-slate-400 mt-1">
                System automatically syncs water level, flow, and rainfall data from monitoring.mrcmekong.org every 15
                minutes. Last sync: 5 minutes ago.
              </p>
            </div>
          </div>

          {/* Add Record Form */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-white">{editingId ? "Edit Data Record" : "Add New Data Record"}</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Manually add or update monitoring data
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/preprocessing">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Preprocessing
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-slate-400 hover:text-white"
                >
                  {showAddForm ? "Hide Form" : "Show Form"}
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent>
                <div className="grid grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Date</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="pl-8 bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Station</Label>
                    <select
                      value={formData.station}
                      onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="" disabled>Select Station</option>
                      {stations.map((station) => (
                        <option key={station} value={station}>
                          {station}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Water Level (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <Button 
                    onClick={handleAddRecord} 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isPending}
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingId ? "Update Record" : "Add Record"}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Data Table */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Data Records</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search records..."
                    className="pl-8 bg-slate-900 border-slate-700 text-white h-9"
                  />
                </div>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 text-slate-300 font-medium">
                    <tr>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading data...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 text-slate-300">
                            <div>{record.date}</div>
                            <div className="text-xs text-slate-500">{record.time}</div>
                          </td>
                          <td className="p-3 text-white font-medium">{record.station}</td>
                          <td className="p-3 text-slate-300">
                            {record.value.toFixed(2)} <span className="text-xs text-slate-500">{record.unit}</span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              record.source === "automated" 
                                ? "bg-blue-900/50 text-blue-200" 
                                : "bg-slate-700 text-slate-300"
                            }`}>
                              {record.source}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleVerifyRecord(record.id, record.status)}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                record.status === "verified"
                                  ? "bg-green-900/50 text-green-200 hover:bg-green-900/70"
                                  : "bg-orange-900/50 text-orange-200 hover:bg-orange-900/70"
                              }`}
                            >
                              {record.status === "verified" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              <span className="capitalize">{record.status}</span>
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditRecord(record)}
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
