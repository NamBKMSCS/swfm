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
import { Loader2, PlayCircle, Download, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { getMLModels, getPrediction, checkMLServiceHealth, type MLModel, type PredictionResult } from "@/app/actions/ml-actions"
import { getStations, type Station } from "@/app/actions/station-actions"
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
  const [stations, setStations] = useState<Station[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedStation, setSelectedStation] = useState<string>("")
  const [horizon, setHorizon] = useState<string>("24")
  const [isLoading, setIsLoading] = useState(true)
  const [isPredicting, setIsPredicting] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [serviceStatus, setServiceStatus] = useState<"healthy" | "unhealthy" | "checking">("checking")

  useEffect(() => {
    loadData()
  }, [])

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
    a.download = `forecast_${selectedModel}_${selectedStation}_${new Date().toISOString().slice(0,10)}.csv`
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
                  <ChartLegend content={<ChartLegendContent />} />
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
    </div>
  )
}
