"use client"

import { useState } from 'react'
import { StationChart } from '@/components/dashboard/station-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface StationDetailModalProps {
  station: {
    id: number
    name: string
    lat: number
    lon: number
    waterLevel: number
    status: 'normal' | 'warning' | 'critical'
  } | null
  isOpen: boolean
  onClose: () => void
}

export function StationDetailModal({ station, isOpen, onClose }: StationDetailModalProps) {
  if (!isOpen || !station) return null

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-xl w-full max-w-5xl h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl border border-slate-700 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 border-b border-slate-700 bg-slate-900 rounded-t-xl shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{station.name}</h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Coordinates: {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 ml-2 hover:bg-slate-800">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-xs sm:text-sm">Current Water Level</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{station.waterLevel}m</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-xs sm:text-sm">Status</p>
                  <span
                    className={`text-base sm:text-lg font-bold ${station.status === 'critical' ? 'text-red-400' :
                      station.status === 'warning' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}
                  >
                    {station.status === 'critical' ? 'CRITICAL' :
                      station.status === 'warning' ? 'WARNING' : 'NORMAL'}
                  </span>
                </div>
                <div className="text-center p-3 sm:p-4 bg-slate-800 rounded-lg sm:col-span-1 col-span-1">
                  <p className="text-slate-400 text-xs sm:text-sm">Last Updated</p>
                  <p className="text-base sm:text-lg font-bold text-white">
                    {new Date().toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <div className="bg-slate-800/50 rounded-lg p-1">
            <StationChart
              stationId={station.id}
              stationName={station.name}
            />
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Technical Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Station ID:</span>
                    <span className="text-white">STN-{station.id.toString().padStart(3, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensor Type:</span>
                    <span className="text-white">Ultrasonic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accuracy:</span>
                    <span className="text-white">±2mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Measurement Frequency:</span>
                    <span className="text-white">Every 15 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Alert Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs sm:text-sm">Normal</span>
                    <span className="text-green-400 font-medium text-sm">{'< 3.0m'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs sm:text-sm">Warning</span>
                    <span className="text-yellow-400 font-medium text-sm">3.0 - 4.0m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs sm:text-sm">Critical</span>
                    <span className="text-red-400 font-medium text-sm">{'> 4.0m'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Extra spacing at bottom for mobile scroll */}
          <div className="h-4"></div>
        </div>
      </div>
    </div>
  )
}