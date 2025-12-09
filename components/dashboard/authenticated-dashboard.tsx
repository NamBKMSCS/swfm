"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeafletMap } from "@/components/dashboard/leaflet-map"
import { StationDetailModal } from "@/components/dashboard/station-detail-modal"
import { getStations, StationWithStatus } from "@/app/actions/station-actions"
import { getDashboardMetrics, DashboardMetrics } from "@/app/actions/dashboard-actions"
import { checkMLServiceHealth } from "@/app/actions/ml-actions"
import { Activity, AlertTriangle, Droplets, Wind, Users, Database, Settings, Shield, Cpu, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface AuthenticatedDashboardProps {
  role: "expert" | "admin"
}

export function AuthenticatedDashboard({ role }: AuthenticatedDashboardProps) {
  const [selectedStation, setSelectedStation] = useState("Vientiane")
  const [selectedStationData, setSelectedStationData] = useState<StationWithStatus | null>(null)
  const [stations, setStations] = useState<StationWithStatus[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mlServiceStatus, setMlServiceStatus] = useState<"online" | "offline" | "checking">("checking")
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeStations: 0,
    floodAlerts: 0,
    avgWaterLevel: null,
    rainfall24h: null
  })

  // Fetch stations and metrics, auto-refresh every 15 minutes
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
      setLastUpdate(new Date())
      console.log('Dashboard data refreshed at:', new Date().toLocaleTimeString())
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [stationsData, metricsData, mlHealth] = await Promise.all([
        getStations(),
        getDashboardMetrics(),
        checkMLServiceHealth()
      ])
      setStations(stationsData)
      setMetrics(metricsData)
      setMlServiceStatus(mlHealth.status === "healthy" ? "online" : "offline")
    } catch (error) {
      console.error("Error fetching data:", error)
      setMlServiceStatus("offline")
    }
  }

  const handleStationClick = (station: StationWithStatus) => {
    setSelectedStation(station.name)
    setSelectedStationData(station)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStationData(null)
  }

  return (
    <>
      <StationDetailModal
        station={selectedStationData}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="px-6 pt-4 pb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">
                Last update: {lastUpdate.toLocaleTimeString('en-GB')} • Auto-refresh every 15 minutes
              </span>
              {/* ML Service Status */}
              <span className={`text-xs flex items-center gap-1 ${mlServiceStatus === "online" ? "text-green-400" :
                  mlServiceStatus === "offline" ? "text-red-400" : "text-slate-400"
                }`}>
                {mlServiceStatus === "online" && <CheckCircle className="w-3 h-3" />}
                {mlServiceStatus === "offline" && <XCircle className="w-3 h-3" />}
                {mlServiceStatus === "checking" && <Cpu className="w-3 h-3 animate-pulse" />}
                ML: {mlServiceStatus}
              </span>
            </div>
            {role === "admin" && (
              <span className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin Mode
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Admin Quick Actions Section */}
            {role === "admin" && (
              <Card className="bg-slate-800/50 border-slate-700 border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-300">Admin Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Link href="/admin/users">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/data">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Database className="mr-2 h-4 w-4" />
                      Data Management
                    </Button>
                  </Link>
                  <Link href="/preprocessing">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Settings className="mr-2 h-4 w-4" />
                      Preprocessing
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Active Stations</p>
                    <h3 className="text-2xl font-bold text-white">{metrics.activeStations}</h3>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Flood Alerts</p>
                    <h3 className={`text-2xl font-bold ${metrics.floodAlerts > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {metrics.floodAlerts}
                    </h3>
                  </div>
                  <AlertTriangle className={`w-8 h-8 ${metrics.floodAlerts > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Avg Water Level</p>
                    <h3 className="text-2xl font-bold text-white">
                      {metrics.avgWaterLevel !== null ? `${metrics.avgWaterLevel}m` : 'N/A'}
                    </h3>
                  </div>
                  <Droplets className="w-8 h-8 text-cyan-500" />
                </CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Rainfall (24h)</p>
                    <h3 className="text-2xl font-bold text-white">
                      {metrics.rainfall24h !== null ? `${metrics.rainfall24h}mm` : 'N/A'}
                    </h3>
                  </div>
                  <Wind className="w-8 h-8 text-slate-400" />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Monitoring Stations</CardTitle>
                  <CardDescription className="text-slate-400">
                    Mekong River water level forecast system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeafletMap
                    stations={stations}
                    onStationClick={handleStationClick}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
