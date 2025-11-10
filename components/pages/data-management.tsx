"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Plus, Edit2, Trash2, AlertCircle, Settings } from "lucide-react"

interface DataManagementPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

interface DataRecord {
  id: string
  date: string
  time: string
  station: string
  value: number
  unit: string
  source: "manual" | "automated"
  status: "verified" | "pending"
}

export function DataManagementPage({ onNavigate, onLogout }: DataManagementPageProps) {
  const [records, setRecords] = useState<DataRecord[]>([
    {
      id: "1",
      date: "2024-11-05",
      time: "10:30",
      station: "Chiang Khong",
      value: 2.45,
      unit: "meters",
      source: "automated",
      status: "verified",
    },
    {
      id: "2",
      date: "2024-11-05",
      time: "09:15",
      station: "Vientiane",
      value: 4.12,
      unit: "meters",
      source: "automated",
      status: "verified",
    },
    {
      id: "3",
      date: "2024-11-04",
      time: "16:45",
      station: "Nakhon Phanom",
      value: 5.78,
      unit: "meters",
      source: "manual",
      status: "pending",
    },
    {
      id: "4",
      date: "2024-11-04",
      time: "14:20",
      station: "Mukdahan",
      value: 3.34,
      unit: "meters",
      source: "manual",
      status: "verified",
    },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    station: "Chiang Khong",
    value: "",
    unit: "meters",
  })

  const stations = ["Chiang Khong", "Vientiane", "Nakhon Phanom", "Mukdahan", "Pakse", "Kratie"]

  const handleAddRecord = () => {
    if (formData.date && formData.time && formData.station && formData.value) {
      if (editingId) {
        setRecords(
          records.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  date: formData.date,
                  time: formData.time,
                  station: formData.station,
                  value: Number.parseFloat(formData.value),
                }
              : r,
          ),
        )
        setEditingId(null)
      } else {
        const newRecord: DataRecord = {
          id: String(records.length + 1),
          date: formData.date,
          time: formData.time,
          station: formData.station,
          value: Number.parseFloat(formData.value),
          unit: formData.unit,
          source: "manual",
          status: "pending",
        }
        setRecords([...records, newRecord])
      }
      setFormData({
        date: new Date().toISOString().split("T")[0],
        time: "12:00",
        station: "Chiang Khong",
        value: "",
        unit: "meters",
      })
      setShowAddForm(false)
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
      setRecords(records.filter((r) => r.id !== id))
    }
  }

  const handleVerifyRecord = (id: string) => {
    setRecords(
      records.map((r) => (r.id === id ? { ...r, status: r.status === "verified" ? "pending" : "verified" } : r)),
    )
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
                        station: "Chiang Khong",
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
                  <Button onClick={handleAddRecord} className="w-full bg-green-600 hover:bg-green-700 text-white">
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
                              onClick={() => handleVerifyRecord(record.id)}
                              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
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
                                className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400"
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
