"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Line, XAxis, YAxis, CartesianGrid, Area, ComposedChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { toast } from "sonner"
import { Loader2, PlayCircle, Download, RefreshCw, AlertCircle, CheckCircle, CloudRain, Wind, Droplets, Thermometer, Clock } from "lucide-react"
import { getMLModels, getPrediction, checkMLServiceHealth, type MLModel, type PredictionResult } from "@/app/actions/ml-actions"
import { getStations, type StationWithStatus } from "@/app/actions/station-actions"
import { getWeatherForecast, type WeatherForecast } from "@/app/actions/weather-actions"
import { useAuth } from "@/providers/auth-provider"

const chartConfig = {
  prediction: {
    label: "Prediction",
    color: "#3B82F6",
  },
  lower: {
    label: "Lower Bound",
    color: "#94A3B8",
  },
  upper: {
    label: "Upper Bound",
    color: "#94A3B8",
  },
} satisfies ChartConfig

const horizonOptions = [
  { value: "6", label: "6 hours (Short-term)" },
  { value: "24", label: "24 hours (1 day)" },
  { value: "72", label: "72 hours (3 days)" },
  { value: "168", label: "168 hours (7 days)" },
]

export function ForecastingPage() {
  const { role } = useAuth()
  const [models, setModels] = useState<MLModel[]>([])
  const [stations, setStations] = useState<StationWithStatus[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedStation, setSelectedStation] = useState<string>("")
  const [horizon, setHorizon] = useState<string>("24")
  const [isLoading, setIsLoading] = useState(true)
  const [isPredicting, setIsPredicting] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [serviceStatus, setServiceStatus] = useState<"healthy" | "unhealthy" | "checking">("checking")
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh weather forecast every 15 minutes
  useEffect(() => {
    if (selectedStation && stations.length > 0) {
      loadWeatherForecast()

      // Set up interval for auto-refresh (15 minutes = 900000ms)
      const intervalId = setInterval(() => {
        loadWeatherForecast()
      }, 15 * 60 * 1000)

      return () => clearInterval(intervalId)
    }
  }, [selectedStation, stations])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [modelsData, stationsData, health] = await Promise.all([
        getMLModels(),
        getStations(),
        checkMLServiceHealth()
      ])
      setModels(modelsData)
      setStations(stationsData)
      setServiceStatus(health.status === "healthy" ? "healthy" : "unhealthy")

      // Set defaults
      if (modelsData.length > 0) {
        const productionModel = modelsData.find(m => m.stage === "Production")
        setSelectedModel(productionModel?.name || modelsData[0].name)
      }
      if (stationsData.length > 0) {
        setSelectedStation(stationsData[0].id.toString())
      }
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadWeatherForecast = async () => {
    if (!selectedStation || stations.length === 0) return

    setIsLoadingWeather(true)
    try {
      const station = stations.find(s => s.id.toString() === selectedStation)
      if (!station) return

      const forecast = await getWeatherForecast(
        station.latitude,
        station.longitude,
        [0, 15, 30, 45, 60, 180, 360, 720, 1440] // Now, 15m, 30m, 45m, 1h, 3h, 6h, 12h, 24h
      )

      if (forecast) {
        setWeatherForecast(forecast)
        setLastWeatherUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to load weather forecast:", error)
    } finally {
      setIsLoadingWeather(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedModel || !selectedStation) {
      toast.error("Please select a model and station")
      return
    }

    setIsPredicting(true)
    try {
      const result = await getPrediction(
        selectedModel,
        parseInt(selectedStation),
        parseInt(horizon)
      )
      setPrediction(result)
      toast.success(`Generated ${result.forecasts.length} forecast points`)
    } catch (error) {
      console.error("Prediction failed:", error)
      toast.error(error instanceof Error ? error.message : "Prediction failed")
    } finally {
      setIsPredicting(false)
    }
  }

  const handleExport = () => {
    if (!prediction) return

    const csv = [
      "timestamp,value,lower_bound,upper_bound",
      ...prediction.forecasts.map(f =>
        `${f.timestamp},${f.value},${f.lower_bound || ""},${f.upper_bound || ""}`
      )
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `forecast_${selectedModel}_${selectedStation}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Forecast exported to CSV")
  }

  const chartData = prediction?.forecasts.map(f => ({
    time: new Date(f.timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }),
    prediction: f.value,
    lower: f.lower_bound,
    upper: f.upper_bound,
  })) || []

  const selectedStationName = stations.find(s => s.id.toString() === selectedStation)?.name || "Unknown"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Water Level Forecasting</h2>
          <p className="text-slate-400">Generate predictions using ML models</p>
        </div>
        <div className="flex items-center gap-4">
          {serviceStatus === "checking" && (
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking...
            </span>
          )}
          {serviceStatus === "healthy" && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> ML Service Online
            </span>
          )}
          {serviceStatus === "unhealthy" && (
            <span className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> ML Service Offline
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Select model, station, and forecast horizon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {models.length === 0 ? (
                    <SelectItem value="_none" disabled>No models available</SelectItem>
                  ) : (
                    models.map(model => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name} (v{model.version})
                        {model.stage === "Production" && " ⭐"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {models.length === 0 && !isLoading && (
                <p className="text-xs text-yellow-400">
                  No models registered. Upload one in Model Registry.
                </p>
              )}
            </div>

            {/* Station Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation} disabled={isLoading}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horizon Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Forecast Horizon</Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {horizonOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handlePredict}
              disabled={isPredicting || !selectedModel || !selectedStation || serviceStatus !== "healthy"}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isPredicting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Generate Forecast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Forecast Results</CardTitle>
              <CardDescription className="text-slate-400">
                {prediction
                  ? `${selectedStationName} - ${prediction.forecasts.length}h forecast using ${prediction.model_name} v${prediction.model_version}`
                  : "Run a prediction to see results"
                }
              </CardDescription>
            </div>
            {prediction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-slate-600 text-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!prediction ? (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                <div className="text-center">
                  <PlayCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configure and generate a forecast</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ComposedChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="font-medium">{Number(value).toFixed(3)}m</span>
                        )}
                      />
                    }
                  />
                  {/* <ChartLegend content={<ChartLegendContent />} /> */}
                  {/* Confidence band */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="transparent"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="transparent"
                    fill="#1E293B"
                    fillOpacity={1}
                  />
                  {/* Main prediction line */}
                  <Line
                    type="monotone"
                    dataKey="prediction"
                    stroke="var(--color-prediction)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-prediction)", r: 3 }}
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prediction Details */}
      {prediction && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Prediction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Model</p>
                <p className="text-white font-medium">{prediction.model_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Version</p>
                <p className="text-white font-medium">v{prediction.model_version}</p>
              </div>
              <div>
                <p className="text-slate-400">Generated At</p>
                <p className="text-white font-medium">
                  {new Date(prediction.generated_at).toLocaleString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Horizon</p>
                <p className="text-white font-medium">{prediction.horizon_hours} hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather Forecast Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <CloudRain className="w-5 h-5" />
                Weather Forecast by Station
              </CardTitle>
              <CardDescription className="text-slate-400">
                {selectedStationName ? `${selectedStationName} - ` : ""}
                Real-time weather forecast from Open-Meteo
                {lastWeatherUpdate && (
                  <span className="ml-2 text-xs">
                    (Updated: {lastWeatherUpdate.toLocaleTimeString('en-GB')})
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWeatherForecast}
              disabled={isLoadingWeather || !selectedStation}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingWeather ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Station Selection Buttons */}
          <div className="mb-6">
            <Label className="text-slate-300 mb-3 block">Select Station</Label>
            <div className="flex flex-wrap gap-2">
              {stations.map(station => (
                <Button
                  key={station.id}
                  variant={selectedStation === station.id.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStation(station.id.toString())}
                  disabled={isLoading}
                  className={
                    selectedStation === station.id.toString()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {station.name}
                </Button>
              ))}
            </div>
          </div>
          {isLoadingWeather && !weatherForecast ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading weather forecast...</span>
            </div>
          ) : !weatherForecast ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <div className="text-center">
                <CloudRain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a station to view weather forecast</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-refresh indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded">
                <Clock className="w-3 h-3" />
                <span>Auto-refreshes every 15 minutes</span>
                <span className="ml-auto">
                  Next update: {new Date(lastWeatherUpdate!.getTime() + 15 * 60 * 1000).toLocaleTimeString('en-GB')}
                </span>
              </div>

              {/* Weather forecast grid */}
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                {Object.entries(weatherForecast.forecasts).map(([key, forecast]) => {
                  // Format time label
                  let timeLabel = key
                  if (key !== "current") {
                    const minutes = forecast.minutes_ahead
                    if (minutes >= 60) {
                      const hours = minutes / 60
                      timeLabel = `+${hours}h`
                    } else {
                      timeLabel = `+${minutes}m`
                    }
                  } else {
                    timeLabel = "Now"
                  }

                  return (
                    <div
                      key={key}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-900 transition-colors"
                    >
                      <div className="text-xs font-semibold text-blue-400 mb-2 text-center">
                        {timeLabel}
                      </div>

                      {/* Temperature */}
                      <div className="flex items-center gap-1 mb-1">
                        <Thermometer className="w-3 h-3 text-red-400" />
                        <span className="text-white text-sm font-medium">
                          {forecast.weather.temperature.toFixed(1)}°C
                        </span>
                      </div>

                      {/* Humidity */}
                      <div className="flex items-center gap-1 mb-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        <span className="text-slate-300 text-xs">
                          {forecast.weather.humidity.toFixed(0)}%
                        </span>
                      </div>

                      {/* Wind */}
                      <div className="flex items-center gap-1 mb-1">
                        <Wind className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-300 text-xs">
                          {forecast.weather.wind_speed.toFixed(1)} km/h
                        </span>
                      </div>

                      {/* Rainfall */}
                      <div className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-cyan-400" />
                        <span className="text-slate-300 text-xs">
                          {forecast.weather.rainfall_1h.toFixed(1)} mm
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Additional weather details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-slate-700 pt-4">
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-white">
                    {weatherForecast.location.latitude.toFixed(4)}, {weatherForecast.location.longitude.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Elevation</p>
                  <p className="text-white">{weatherForecast.location.elevation}m</p>
                </div>
                <div>
                  <p className="text-slate-400">Timezone</p>
                  <p className="text-white">{weatherForecast.location.timezone}</p>
                </div>
                <div>
                  <p className="text-slate-400">Data Source</p>
                  <p className="text-white">Open-Meteo API</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
