"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Import CSS for Leaflet
import 'leaflet/dist/leaflet.css'

// Dynamic imports to avoid SSR issues with ssr: false
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { 
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-slate-800 rounded-lg flex items-center justify-center"><div className="text-slate-400">Loading map...</div></div>
})

const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface WaterStation {
  id: number
  name: string
  lat: number
  lng: number
  waterLevel: number
  status: 'normal' | 'warning' | 'critical'
}

interface LeafletMapProps {
  stations: WaterStation[]
  onStationClick?: (station: WaterStation) => void
}

export function LeafletMap({ stations, onStationClick }: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Fix for Leaflet icon in Next.js
    if (typeof window !== 'undefined') {
      const L = require('leaflet')
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })
    }
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-[500px] bg-slate-800 rounded-lg flex items-center justify-center">
        <div className="text-slate-400">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden">
      <MapContainer
        center={[10.8231, 106.6297]} // Ho Chi Minh City
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            eventHandlers={{
              click: () => onStationClick?.(station)
            }}
          >
            {/* <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{station.name}</h3>
                <p className="text-xs text-gray-600">
                  Water Level: {station.waterLevel}m
                </p>
                <span 
                  className={`text-xs px-2 py-1 rounded ${
                    station.status === 'critical' ? 'bg-red-100 text-red-600' :
                    station.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}
                >
                  {station.status.toUpperCase()}
                </span>
              </div>
            </Popup> */}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}