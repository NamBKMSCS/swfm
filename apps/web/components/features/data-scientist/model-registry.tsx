"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Upload,
  Trash2,
  Rocket,
  RefreshCw,
  FileCode2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Brain,
} from "lucide-react"
import {
  getMLModels,
  uploadMLModel,
  promoteModel,
  deleteMLModel,
  checkMLServiceHealth,
  trainModels,
  trainAllStations,
  getTrainingStatus,
  type MLModel,
  type TrainingRequest
} from "@/app/actions/ml-actions"
import { useAuth } from "@/providers/auth-provider"

export function ModelRegistry() {
  const { role } = useAuth()
  const [models, setModels] = useState<MLModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [trainDialogOpen, setTrainDialogOpen] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<"healthy" | "unhealthy" | "checking">("checking")

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState("")
  const [algorithm, setAlgorithm] = useState("arima")
  const [description, setDescription] = useState("")

  // Training form state
  const [trainStationId, setTrainStationId] = useState("2")  // Changed from "1" to "2" (Chiang Saen)
  const [isTrainAllStations, setIsTrainAllStations] = useState(true)
  const [trainStartDate, setTrainStartDate] = useState("2025-11-01")
  const [trainEndDate, setTrainEndDate] = useState("2025-12-01")
  const [trainHorizons, setTrainHorizons] = useState("15,30,45,60")
  const [trainModelTypes, setTrainModelTypes] = useState("linear,ridge")

  useEffect(() => {
    loadModels()
    checkHealth()
  }, [])

  const checkHealth = async () => {
    setServiceStatus("checking")
    const health = await checkMLServiceHealth()
    setServiceStatus(health.status === "healthy" ? "healthy" : "unhealthy")
  }

  const loadModels = async () => {
    setIsLoading(true)
    try {
      const data = await getMLModels()

      // Extract horizon from model name (e.g., "swfm-linear-unified-15min" -> "15min")
      const getHorizon = (name: string) => {
        const match = name.match(/(\d+min)$/)
        return match ? match[1] : null
      }

      // Group by horizon and keep only the newest model (by timestamp)
      const horizonMap = new Map<string, MLModel>()
      data.forEach(model => {
        const horizon = getHorizon(model.name)
        if (horizon) {
          const existing = horizonMap.get(horizon)
          const currentTime = parseInt(model.created_at || '0')
          const existingTime = parseInt(existing?.created_at || '0')

          if (!existing || currentTime > existingTime) {
            horizonMap.set(horizon, model)
          }
        }
      })

      // Convert back to array and sort by horizon value
      const uniqueModels = Array.from(horizonMap.values()).sort((a, b) => {
        const horizonA = parseInt(getHorizon(a.name)?.replace('min', '') || '0')
        const horizonB = parseInt(getHorizon(b.name)?.replace('min', '') || '0')
        return horizonA - horizonB
      })

      setModels(uniqueModels)
    } catch (error) {
      console.error("Failed to load models:", error)
      toast.error("Failed to load models")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !modelName) {
      toast.error("Please provide a file and model name")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("model_name", modelName)
      formData.append("algorithm", algorithm)
      formData.append("description", description)

      const result = await uploadMLModel(formData)
      toast.success(result.message)
      setUploadDialogOpen(false)
      resetUploadForm()
      loadModels()
    } catch (error) {
      console.error("Upload failed:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handlePromote = async (modelName: string, version: string) => {
    try {
      const result = await promoteModel(modelName, version, "Production")
      toast.success(result.message)
      loadModels()
    } catch (error) {
      console.error("Promote failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to promote model")
    }
  }

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) {
      return
    }

    try {
      const result = await deleteMLModel(modelName)
      toast.success(result.message)
      loadModels()
    } catch (error) {
      console.error("Delete failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete model")
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setModelName("")
    setAlgorithm("arima")
    setDescription("")
  }

  const handleTrainModels = async () => {
    setIsTraining(true)
    try {
      const horizons = trainHorizons.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h))
      const modelTypes = trainModelTypes.split(',').map(m => m.trim()).filter(m => m)

      // Train unified model (all stations, station_id as feature)
      const request: TrainingRequest = {
        station_id: null, // null = unified model
        start_date: trainStartDate,
        end_date: trainEndDate,
        prediction_horizons: horizons,
        model_types: modelTypes,
        test_size: 0.2,
        use_time_split: true,
        register_model: true
      }

      const result = await trainModels(request)

      toast.success(`Unified model training completed! ${result.results.length} models trained in ${result.total_training_time_seconds.toFixed(2)}s`, {
        description: `All stations | Features: ${result.features_count} (includes station_id)`
      })

      setTrainDialogOpen(false)
      loadModels()
    } catch (error) {
      console.error("Training failed:", error)
      toast.error(error instanceof Error ? error.message : "Training failed")
    } finally {
      setIsTraining(false)
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Production":
        return "bg-green-600 hover:bg-green-600"
      case "Staging":
        return "bg-yellow-600 hover:bg-yellow-600"
      case "Archived":
        return "bg-slate-600 hover:bg-slate-600"
      default:
        return "bg-blue-600 hover:bg-blue-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Model Registry</h2>
          <p className="text-slate-400">Manage ML models with MLflow</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Service Status */}
          <div className="flex items-center gap-2">
            {serviceStatus === "checking" && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            )}
            {serviceStatus === "healthy" && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            {serviceStatus === "unhealthy" && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-slate-400">
              ML Service: {serviceStatus}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadModels(); checkHealth() }}
            disabled={isLoading}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Train New Model Dialog */}
          <Dialog open={trainDialogOpen} onOpenChange={setTrainDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Brain className="w-4 h-4 mr-2" />
                Train New Model
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Train New Models</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Train unified models for all stations using preprocessing configs from database
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Start Date</Label>
                    <Input
                      type="date"
                      value={trainStartDate}
                      onChange={(e) => setTrainStartDate(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">End Date</Label>
                    <Input
                      type="date"
                      value={trainEndDate}
                      onChange={(e) => setTrainEndDate(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Prediction Horizons (minutes, comma-separated)</Label>
                  <Input
                    value={trainHorizons}
                    onChange={(e) => setTrainHorizons(e.target.value)}
                    placeholder="15,30,45,60"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500">Default: 15, 30, 45, 60 minutes</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Model Types (comma-separated)</Label>
                  <Input
                    value={trainModelTypes}
                    onChange={(e) => setTrainModelTypes(e.target.value)}
                    placeholder="linear,ridge"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500">Available: linear, ridge</p>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
                  <p className="text-xs text-blue-300">
                    ℹ️ Training uses preprocessing configurations from the database.
                    Models will be logged to MLflow for tracking and performance saved to database.
                    <span className="block mt-1 text-purple-300 font-medium">
                      ✨ Unified model: Trains ONE model using data from all stations with station_id as a feature.
                    </span>
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setTrainDialogOpen(false)}
                  className="border-slate-600 text-slate-300"
                  disabled={isTraining}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTrainModels}
                  disabled={isTraining || (!isTrainAllStations && !trainStationId)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isTraining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isTraining ? "Training..." : isTrainAllStations ? "Train Unified Model" : "Start Training"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Models Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Current Models</CardTitle>
          <CardDescription className="text-slate-400">
            {models.length} model{models.length !== 1 ? "s" : ""} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileCode2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No models available</p>
              <p className="text-sm mt-2">Train a model to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Model Name</TableHead>
                  <TableHead className="text-slate-300">Version</TableHead>
                  <TableHead className="text-slate-300">Timestamp</TableHead>
                  <TableHead className="text-slate-300">Train/Test Samples</TableHead>
                  <TableHead className="text-slate-300">Scaler</TableHead>
                  <TableHead className="text-slate-300">Accuracy (R²)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={`${model.name}-${model.version}`} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="font-medium text-white">
                      {model.name}
                    </TableCell>
                    <TableCell className="text-slate-300">v{model.version}</TableCell>
                    <TableCell className="text-slate-300">
                      {model.created_at ? new Date(parseInt(model.created_at)).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {model.data_shape || '-'}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                        {model.scaler || 'None'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {model.accuracy !== undefined ? `${(model.accuracy * 100).toFixed(2)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MLflow Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">MLflow Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            Access the MLflow UI at{" "}
            <a
              href="http://localhost:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              http://localhost:5000
            </a>{" "}
            for detailed experiment tracking, model comparison, and artifact management.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
