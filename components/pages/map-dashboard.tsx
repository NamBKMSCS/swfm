"use client"

import { useState } from 'react'
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { LeafletMap } from "@/components/dashboard/leaflet-map"
import { StationDetailModal } from "@/components/dashboard/station-detail-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MapDashboardProps {
  role: "guest" | "expert" | "admin"
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

// Mock data cho water stations
const mockStations = [
  {
    id: 1,
    name: "Station A - District 1",
    lat: 10.8231,
    lng: 106.6297,
    waterLevel: 2.5,
    status: 'normal' as const
  },
  {
    id: 2,
    name: "Station B - District 3",
    lat: 10.7769,
    lng: 106.7009,
    waterLevel: 3.2,
    status: 'warning' as const
  },
  {
    id: 3,
    name: "Station C - District 7",
    lat: 10.7373,
    lng: 106.7196,
    waterLevel: 4.1,
    status: 'critical' as const
  },
  {
    id: 4,
    name: "Station D - Thu Duc",
    lat: 10.8505,
    lng: 106.7717,
    waterLevel: 1.8,
    status: 'normal' as const
  }
]

export function MapDashboard({ role, onNavigate, onLogout }: MapDashboardProps) {
  const [selectedStation, setSelectedStation] = useState<typeof mockStations[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleStationClick = (station: typeof mockStations[0]) => {
    setSelectedStation(station)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedStation(null)
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar
        currentPage="map"
        role={role}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Water Station Map" role={role} />
         
        {/* Station Detail Modal */}
        <StationDetailModal
          station={selectedStation}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
        <main className="flex-1 overflow-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Water Monitoring Stations</CardTitle>
            </CardHeader>
            <CardContent>
              <LeafletMap 
                stations={mockStations} 
                onStationClick={handleStationClick}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Station Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockStations.map((station) => (
                  <div 
                    key={station.id} 
                    className="p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => handleStationClick(station)}
                  >
                    <h3 className="font-semibold text-white text-sm">{station.name}</h3>
                    <p className="text-slate-300 text-xs mt-1">
                      Level: {station.waterLevel}m
                    </p>
                    <span 
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        station.status === 'critical' ? 'bg-red-600 text-white' :
                        station.status === 'warning' ? 'bg-yellow-600 text-white' :
                        'bg-green-600 text-white'
                      }`}
                    >
                      {station.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
       
      </div>
    </div>
  )
}