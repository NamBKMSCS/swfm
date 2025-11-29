"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Plus, Edit2, Trash2, AlertCircle, Settings } from "lucide-react"
import { getDataRecords, addDataRecord, updateDataRecord, deleteDataRecord, verifyDataRecord, getStations, DataRecord } from "@/app/actions/data-actions"
import { toast } from "sonner"

interface DataManagementPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression") => void
  onLogout: () => void
}

export function DataManagementPage({ onNavigate, onLogout }: DataManagementPageProps) {
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
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="data" role="admin" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Data Management" role="admin" />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
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
                  <Button
                    onClick={() => onNavigate("preprocessing")}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Preprocessing
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddForm(!showAddForm)
                      setEditingId(null)
                      setFormData({
                        date: new Date().toISOString().split("T")[0],
                        time: "12:00",
                        station: stations[0] || "",
                        value: "",
                        unit: "meters",
                      })
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {showAddForm ? "Cancel" : "Add Record"}
                  </Button>
                </div>
              </CardHeader>

              {showAddForm && (
                <CardContent className="space-y-4 border-t border-slate-700 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Time</label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Station</label>
                      <select
                        value={formData.station}
                        onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        {stations.map((station) => (
                          <option key={station} value={station}>
                            {station}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Water Level Value</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                        />
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          <option>meters</option>
                          <option>cm</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddRecord} disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                    {editingId ? "Update Record" : "Add Record"}
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Data Records Table */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Data Records</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  All monitoring data entries with verification status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-white">Loading data...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Date/Time</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Station</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Value</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Source</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-white font-medium">
                              {record.date} {record.time}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{record.station}</td>
                            <td className="py-3 px-4 text-white font-mono">
                              {record.value.toFixed(2)} {record.unit}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  record.source === "automated"
                                    ? "bg-blue-900/30 text-blue-300"
                                    : "bg-slate-700/50 text-slate-300"
                                }`}
                              >
                                {record.source === "automated" ? "Auto" : "Manual"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleVerifyRecord(record.id, record.status)}
                                disabled={isPending}
                                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer disabled:opacity-50 ${
                                  record.status === "verified"
                                    ? "bg-green-900/30 text-green-300"
                                    : "bg-orange-900/30 text-orange-300"
                                }`}
                              >
                                {record.status === "verified" ? "Verified" : "Pending"}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditRecord(record)}
                                  disabled={isPending}
                                  className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400 disabled:opacity-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record.id)}
                                  disabled={isPending}
                                  className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
