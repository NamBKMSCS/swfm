"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MapView } from "@/components/dashboard/map-view"
import { StationDataPanel } from "@/components/dashboard/station-data-panel"
import { ForecastChart } from "@/components/dashboard/forecast-chart"
import { AlertsBanner } from "@/components/dashboard/alerts-banner"

interface GuestDashboardProps {
  role: "guest" | "expert" | "admin"
  onNavigate: (page: "guest" | "expert" | "evaluation" | "admin" | "tune" | "users" | "data" | "preprocessing" | "map" | "regression") => void
  onLogout: () => void
  onLogin: () => void
}

export function GuestDashboard({ role, onNavigate, onLogout, onLogin }: GuestDashboardProps) {
  const [selectedStation, setSelectedStation] = useState("Vientiane")
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Auto-refresh data every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
      console.log('Guest dashboard data refreshed at:', new Date().toLocaleTimeString())
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="guest" role={role} onNavigate={onNavigate} onLogout={onLogout} onLogin={onLogin} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Water Forecast Dashboard" role={role} />

        <main className="flex-1 overflow-auto">
          <div className="px-6 pt-4 pb-2">
            <span className="text-xs text-slate-400">
              Last update: {lastUpdate.toLocaleTimeString('en-GB')} • Auto-refresh every 15 minutes
            </span>
          </div>
          <div className="p-6 pt-2 space-y-6">
            {/* Alerts Banner */}
            <AlertsBanner />

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Map and Station List */}
              <div className="col-span-2 space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monitoring Stations</CardTitle>
                    <CardDescription className="text-slate-400">
                      Mekong River water level forecast system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MapView onStationSelect={setSelectedStation} />
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">10-Day Forecast</CardTitle>
                    <CardDescription className="text-slate-400">
                      {selectedStation} - Water Level Prediction
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ForecastChart station={selectedStation} />
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - Station Details */}
              <div>
                <StationDataPanel station={selectedStation} role={role} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
