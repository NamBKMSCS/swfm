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
} from "lucide-react"
import {
  getMLModels,
  uploadMLModel,
  promoteModel,
  deleteMLModel,
  checkMLServiceHealth,
  type MLModel
} from "@/app/actions/ml-actions"

interface ModelRegistryProps {
  role: "admin" | "expert"
}

export function ModelRegistry({ role }: ModelRegistryProps) {
  const [models, setModels] = useState<MLModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<"healthy" | "unhealthy" | "checking">("checking")

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [modelName, setModelName] = useState("")
  const [algorithm, setAlgorithm] = useState("arima")
  const [description, setDescription] = useState("")

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
      setModels(data)
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

          {/* Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload Model
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Upload New Model</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Upload a PKL file to register a new model version
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Model File (PKL)</Label>
                  <Input
                    type="file"
                    accept=".pkl,.pickle"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  {uploadFile && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <FileCode2 className="w-3 h-3" />
                      {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Model Name</Label>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g., water-level-arima"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Algorithm</Label>
                  <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="arima">ARIMA</SelectItem>
                      <SelectItem value="lstm">LSTM</SelectItem>
                      <SelectItem value="hybrid">Hybrid ARIMA-LSTM</SelectItem>
                      <SelectItem value="prophet">Prophet</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the model, training data, etc."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setUploadDialogOpen(false); resetUploadForm() }}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadFile || !modelName}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? "Uploading..." : "Upload Model"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Models Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Registered Models</CardTitle>
          <CardDescription className="text-slate-400">
            {models.length} model{models.length !== 1 ? "s" : ""} registered
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
              <p>No models registered yet</p>
              <p className="text-sm mt-2">Upload your first model to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Name</TableHead>
                  <TableHead className="text-slate-300">Version</TableHead>
                  <TableHead className="text-slate-300">Stage</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.name} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="font-medium text-white">
                      {model.name}
                    </TableCell>
                    <TableCell className="text-slate-300">v{model.version}</TableCell>
                    <TableCell>
                      <Badge className={getStageColor(model.stage)}>
                        {model.stage || "None"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 max-w-xs truncate">
                      {model.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {model.stage !== "Production" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromote(model.name, model.version)}
                            className="border-green-600 text-green-400 hover:bg-green-900/50"
                          >
                            <Rocket className="w-3 h-3 mr-1" />
                            Promote
                          </Button>
                        )}
                        {role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(model.name)}
                            className="border-red-600 text-red-400 hover:bg-red-900/50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
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
