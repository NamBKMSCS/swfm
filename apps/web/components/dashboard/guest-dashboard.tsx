"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeafletMap } from "@/components/dashboard/leaflet-map"
import { StationDetailModal } from "@/components/dashboard/station-detail-modal"
import { getStations, StationWithStatus } from "@/app/actions/station-actions"


export function GuestDashboard() {
  const [selectedStation, setSelectedStation] = useState<string>("Vientiane")
  const [selectedStationData, setSelectedStationData] = useState<StationWithStatus | null>(null)
  const [stations, setStations] = useState<StationWithStatus[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch stations
  useEffect(() => {
    fetchStations()
    setLastUpdate(new Date())
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
      <main className="flex-1 overflow-auto">
        <div className="px-6 pt-4 pb-2">
          <span className="text-xs text-slate-400">
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString('en-GB') : '...'} • Auto-refresh every 15 minutes
          </span>
        </div>

        <StationDetailModal
          station={selectedStationData}
          isOpen={isModalOpen}
          onClose={closeModal}
        />

        <div className="p-6 pt-2 space-y-6">
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
      </main>
    </>
  )
}
