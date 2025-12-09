"use client"

import { useEffect, useState } from 'react'
import { StationChart } from '@/components/dashboard/station-chart'
import { ForecastChart } from '@/components/dashboard/forecast-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Cloud, Thermometer, Droplets, Wind, Gauge } from 'lucide-react'
import { StationWithStatus } from '@/app/actions/station-actions'
import { getLatestWeatherForStation, WeatherData } from '@/app/actions/weather-actions'

/**
 * Get wind direction as compass point
 */
function getWindDirection(degrees: number | null): string {
  if (degrees === null) return 'N/A'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

interface StationDetailModalProps {
  station: StationWithStatus | null
  isOpen: boolean
  onClose: () => void
}

export function StationDetailModal({ station, isOpen, onClose }: StationDetailModalProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  useEffect(() => {
    if (isOpen && station) {
      setLoadingWeather(true)
      getLatestWeatherForStation(station.id)
        .then(data => setWeather(data))
        .finally(() => setLoadingWeather(false))
    } else {
      setWeather(null)
    }
  }, [isOpen, station])

  if (!isOpen || !station) return null

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-9999 p-2 sm:p-4"
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
              Coordinates: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
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

          {/* Weather Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                Weather Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWeather ? (
                <div className="text-center py-4 text-slate-400">Loading weather data...</div>
              ) : weather ? (
                <div className="space-y-4">
                  {/* Weather main condition */}
                  {weather.weather_main && (
                    <div className="text-center pb-2 border-b border-slate-700">
                      <p className="text-lg font-semibold text-white capitalize">{weather.weather_main}</p>
                      <p className="text-sm text-slate-400 capitalize">{weather.weather_description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Temperature */}
                    <div className="text-center p-3 bg-linear-to-br from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
                      <Thermometer className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                      <p className="text-slate-400 text-xs">Temperature</p>
                      <p className="text-xl font-bold text-white">
                        {weather.temperature !== null ? `${weather.temperature.toFixed(1)}°C` : 'N/A'}
                      </p>
                      {weather.temp_min !== null && weather.temp_max !== null && (
                        <p className="text-xs text-slate-400">
                          {weather.temp_min.toFixed(0)}° / {weather.temp_max.toFixed(0)}°
                        </p>
                      )}
                    </div>

                    {/* Humidity */}
                    <div className="text-center p-3 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                      <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                      <p className="text-slate-400 text-xs">Humidity</p>
                      <p className="text-xl font-bold text-white">
                        {weather.humidity !== null ? `${weather.humidity}%` : 'N/A'}
                      </p>
                    </div>

                    {/* Wind */}
                    <div className="text-center p-3 bg-linear-to-br from-teal-500/20 to-green-500/20 rounded-lg border border-teal-500/30">
                      <Wind className="w-5 h-5 mx-auto mb-1 text-teal-400" />
                      <p className="text-slate-400 text-xs">Wind</p>
                      <p className="text-xl font-bold text-white">
                        {weather.wind_speed !== null ? `${weather.wind_speed.toFixed(1)} m/s` : 'N/A'}
                      </p>
                      <p className="text-xs text-slate-400">{getWindDirection(weather.wind_deg)}</p>
                    </div>

                    {/* Pressure */}
                    <div className="text-center p-3 bg-linear-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                      <Gauge className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                      <p className="text-slate-400 text-xs">Pressure</p>
                      <p className="text-xl font-bold text-white">
                        {weather.pressure !== null ? `${weather.pressure} hPa` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Rain if available */}
                  {weather.rain_1h !== null && weather.rain_1h > 0 && (
                    <div className="text-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-blue-400 text-sm">
                        🌧️ Rain (last hour): <span className="font-bold">{weather.rain_1h.toFixed(1)} mm</span>
                      </p>
                    </div>
                  )}

                  {/* Last updated */}
                  <p className="text-xs text-slate-500 text-right">
                    Weather updated: {new Date(weather.measured_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No weather data available</p>
                  <p className="text-xs mt-1">Weather data is synced hourly</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <div className="bg-slate-800/50 rounded-lg p-1">
            <StationChart
              stationId={station.id}
              stationName={station.name}
            />
          </div>

          {/* Forecast Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">10-Day Water Level Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart
                station={station.name}
                stationId={station.id}
                showMultiple={true}
              />
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Technical Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Station Code:</span>
                    <span className="text-white">{station.station_code}</span>
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
                    <span className="text-green-400 font-medium text-sm">
                      {'< '}{station.alarm_level ?? 3.5}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs sm:text-sm">Warning</span>
                    <span className="text-yellow-400 font-medium text-sm">
                      {station.alarm_level ?? 3.5}m - {station.flood_level ?? 4.5}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs sm:text-sm">Critical</span>
                    <span className="text-red-400 font-medium text-sm">
                      {'>= '}{station.flood_level ?? 4.5}m
                    </span>
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
