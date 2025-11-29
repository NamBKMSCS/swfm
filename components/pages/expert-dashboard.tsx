"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapView } from "@/components/dashboard/map-view"
import { StationDataPanel } from "@/components/dashboard/station-data-panel"
import { ForecastChart } from "@/components/dashboard/forecast-chart"
import { AlertsBanner } from "@/components/dashboard/alerts-banner"
import { Activity, AlertTriangle, Droplets, Wind } from "lucide-react"

interface ExpertDashboardProps {
  role: "expert" | "admin"
}

export function ExpertDashboard({ role }: ExpertDashboardProps) {
  const [selectedStation, setSelectedStation] = useState("Vientiane")
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Auto-refresh data every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
      console.log('Expert dashboard data refreshed at:', new Date().toLocaleTimeString())
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <main className="flex-1 overflow-auto">
        <div className="px-6 pt-4 pb-2">
          <span className="text-xs text-slate-400">
            Last update: {lastUpdate.toLocaleTimeString('en-GB')} • Auto-refresh every 15 minutes
          </span>
        </div>
        <div className="p-6 space-y-6">
          <AlertsBanner />

          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Active Stations</p>
                  <h3 className="text-2xl font-bold text-white">24</h3>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Flood Alerts</p>
                  <h3 className="text-2xl font-bold text-red-500">3</h3>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Avg Water Level</p>
                  <h3 className="text-2xl font-bold text-white">4.2m</h3>
                </div>
                <Droplets className="w-8 h-8 text-cyan-500" />
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Rainfall (24h)</p>
                  <h3 className="text-2xl font-bold text-white">12mm</h3>
                </div>
                <Wind className="w-8 h-8 text-slate-400" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Monitoring Stations</CardTitle>
                  <CardDescription className="text-slate-400">
                    Select station to tune model parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MapView onStationSelect={setSelectedStation} />
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Forecast Comparison</CardTitle>
                  <CardDescription className="text-slate-400">
                    {selectedStation} - Model Comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ForecastChart station={selectedStation} />
                </CardContent>
              </Card>
            </div>

            <div>
              <StationDataPanel station={selectedStation} role={role} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
