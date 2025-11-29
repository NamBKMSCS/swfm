"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeafletMap } from "@/components/dashboard/leaflet-map"
import { StationDataPanel } from "@/components/dashboard/station-data-panel"
import { ForecastChart } from "@/components/dashboard/forecast-chart"
import { AlertsBanner } from "@/components/dashboard/alerts-banner"
import { StationDetailModal } from "@/components/dashboard/station-detail-modal"
import { getStations, Station } from "@/app/actions/station-actions"

interface GuestDashboardProps {
  role: "guest" | "expert" | "admin"
}

export function GuestDashboard({ role }: GuestDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<string>("Vientiane")
  const [selectedStationData, setSelectedStationData] = useState<Station | null>(null)
  const [stations, setStations] = useState<Station[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch stations
  useEffect(() => {
    fetchStations()
    const interval = setInterval(() => {
      fetchStations()
      setLastUpdate(new Date())
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(interval)
  }, [])

  const fetchStations = async () => {
    try {
      const data = await getStations()
      setStations(data)
    } catch (error) {
      console.error("Error fetching stations:", error)
    }
  }

  const handleStationClick = (station: Station) => {
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
      <main className="flex-1 overflow-auto">
        <div className="px-6 pt-4 pb-2">
          <span className="text-xs text-slate-400">
            Last update: {lastUpdate.toLocaleTimeString('en-GB')} • Auto-refresh every 15 minutes
          </span>
        </div>
        
        <StationDetailModal
          station={selectedStationData}
          isOpen={isModalOpen}
          onClose={closeModal}
        />

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
                  <LeafletMap 
                    stations={stations} 
                    onStationClick={handleStationClick}
                  />
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
    </>
  )
}
