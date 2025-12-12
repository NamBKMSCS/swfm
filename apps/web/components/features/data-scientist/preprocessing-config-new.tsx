"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  RefreshCw,
  Settings,
  Play,
  Clock,
  TrendingUp,
  Calendar,
  Waves
} from "lucide-react"
import {
  getPreprocessingConfigs,
  updatePreprocessingConfig,
  runPreprocessing,
  getPreprocessingFeatures,
  getPreprocessingPipelineSummary
} from "@/app/actions/preprocessing-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface ConfigField {
  type: "number" | "select" | "boolean" | "array"
  value: any
  label?: string
  min?: number
  max?: number
  step?: number
  options?: string[]
}

export function PreprocessingConfigPageNew() {
  const [configs, setConfigs] = useState<any[]>([])
  const [features, setFeatures] = useState<any>(null)
  const [pipelineSummary, setPipelineSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)

  // Preprocessing test parameters
  const [testStationId, setTestStationId] = useState(2)  // Changed from 1 to 2 (Chiang Saen)
  const [testStartDate, setTestStartDate] = useState("2025-11-01")
  const [testEndDate, setTestEndDate] = useState("2025-11-30")
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [configsData, featuresData, summaryData] = await Promise.all([
        getPreprocessingConfigs(),
        getPreprocessingFeatures(),
        getPreprocessingPipelineSummary()
      ])

      setConfigs(configsData)
      setFeatures(featuresData)
      setPipelineSummary(summaryData)

      // Set initial selection to one of the editable configs
      const editableConfigs = configsData.filter((c: any) =>
        c.method_id === 'train_test_split' ||
        c.method_id === 'feature_scaling' ||
        c.method_id === 'data_cleaning' ||
        c.method_id === 'training_data_range'
      )

      if (editableConfigs.length > 0) {
        setSelectedConfig(editableConfigs[0].method_id)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load preprocessing configurations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleConfig = async (methodId: string, currentEnabled: boolean) => {
    try {
      await updatePreprocessingConfig(methodId, !currentEnabled)

      setConfigs(configs.map(c =>
        c.method_id === methodId ? { ...c, enabled: !currentEnabled } : c
      ))

      toast.success(`${methodId} ${!currentEnabled ? "enabled" : "disabled"}`)
    } catch (error) {
      console.error("Error toggling config:", error)
      toast.error("Failed to update configuration")
    }
  }

  const handleUpdateConfig = async (methodId: string, newConfig: any) => {
    setIsSaving(true)
    try {
      await updatePreprocessingConfig(methodId, undefined, newConfig)

      setConfigs(configs.map(c =>
        c.method_id === methodId ? { ...c, config: newConfig } : c
      ))

      toast.success(`Configuration for ${methodId} saved successfully`)
    } catch (error) {
      console.error("Error updating config:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunPreprocessing = async () => {
    setIsRunning(true)
    setTestResult(null)
    try {
      const result = await runPreprocessing(
        testStationId,
        testStartDate,
        testEndDate,
        [15, 30, 45, 60, 90]
      )

      setTestResult(result)
      toast.success(`Preprocessing completed: ${result.records_processed} records processed`)
    } catch (error: any) {
      console.error("Error running preprocessing:", error)
      toast.error(error.message || "Preprocessing failed")
    } finally {
      setIsRunning(false)
    }
  }

  const selectedConfigData = configs.find(c => c.method_id === selectedConfig)
  const enabledCount = configs.filter(c => c.enabled).length

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Preprocessing Configuration</h2>
            <p className="text-slate-400">Configure data preprocessing and feature engineering pipeline (39 features)</p>
          </div>
          <Button
            variant="outline"
            onClick={loadData}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Editable Configs</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
                <Settings className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Training Features</p>
                  <p className="text-2xl font-bold text-white">39</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Preprocessing Steps</p>
                  <p className="text-2xl font-bold text-white">{pipelineSummary?.total_steps || configs.length}</p>
                </div>
                <Waves className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Prediction Horizons</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="configurations">Configurations</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="test">Test Run</TabsTrigger>
          </TabsList>

          {/* Configurations Tab */}
          <TabsContent value="configurations" className="space-y-4">
            {/* Current Configuration Summary */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Current Configuration Summary</CardTitle>
                <CardDescription className="text-slate-400">
                  Overview of active preprocessing settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {configs
                    .filter(config =>
                      config.method_id === 'train_test_split' ||
                      config.method_id === 'feature_scaling' ||
                      config.method_id === 'data_cleaning' ||
                      config.method_id === 'training_data_range'
                    )
                    .map((config) => (
                      <div key={config.method_id} className="bg-slate-750 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-white">
                            {config.method_id.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </h4>
                          {config.enabled ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          {config.method_id === 'train_test_split' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Test Size:</span>
                                <span className="text-white font-medium">{(config.config.test_size * 100).toFixed(0)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Method:</span>
                                <span className="text-white font-medium capitalize">{config.config.method.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Shuffle:</span>
                                <span className="text-white font-medium">{config.config.shuffle ? 'Yes' : 'No'}</span>
                              </div>
                            </>
                          )}
                          {config.method_id === 'feature_scaling' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Method:</span>
                                <span className="text-white font-medium capitalize">{config.config.method}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">With Mean:</span>
                                <span className="text-white font-medium">{config.config.with_mean ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">With Std:</span>
                                <span className="text-white font-medium">{config.config.with_std ? 'Yes' : 'No'}</span>
                              </div>
                            </>
                          )}
                          {config.method_id === 'data_cleaning' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Missing Strategy:</span>
                                <span className="text-white font-medium capitalize">{config.config.missing_value_strategy}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Min History:</span>
                                <span className="text-white font-medium">{config.config.min_required_history_hours}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Outlier Detection:</span>
                                <span className="text-white font-medium">{config.config.outlier_detection?.enabled ? 'Enabled' : 'Disabled'}</span>
                              </div>
                            </>
                          )}
                          {config.method_id === 'training_data_range' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Data Range:</span>
                                <span className="text-white font-medium">{config.config.months} {config.config.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Type:</span>
                                <span className="text-white font-medium">Most Recent</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Status:</span>
                                <span className="text-white font-medium">Active</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Editable Configurations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Config List */}
              <div className="lg:col-span-1 space-y-2">
                {configs
                  .filter(config =>
                    config.method_id === 'train_test_split' ||
                    config.method_id === 'feature_scaling' ||
                    config.method_id === 'data_cleaning' ||
                    config.method_id === 'training_data_range'
                  )
                  .map((config) => (
                    <Card
                      key={config.method_id}
                      className={cn(
                        "cursor-pointer transition border-slate-700",
                        selectedConfig === config.method_id
                          ? "bg-slate-700 border-blue-500"
                          : "bg-slate-800 hover:bg-slate-750"
                      )}
                      onClick={() => setSelectedConfig(config.method_id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-white">
                                {config.method_id.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </h3>
                              {config.enabled && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {config.config.description || "No description"}
                            </p>
                          </div>
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={() => handleToggleConfig(config.method_id, config.enabled)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Config Details */}
              <div className="lg:col-span-2">
                {selectedConfigData ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white">
                            {selectedConfigData.method_id.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </CardTitle>
                          <CardDescription>
                            {selectedConfigData.config.description || "Configuration details"}
                          </CardDescription>
                        </div>
                        <Badge variant={selectedConfigData.enabled ? "default" : "secondary"}>
                          {selectedConfigData.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ConfigEditor
                        key={selectedConfigData.method_id}
                        methodId={selectedConfigData.method_id}
                        config={selectedConfigData.config}
                        onSave={(newConfig) => handleUpdateConfig(selectedConfigData.method_id, newConfig)}
                        isSaving={isSaving}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-8 text-center">
                      <p className="text-slate-400">Select a configuration to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            {features && (
              <>
                {/* Overview Chart */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Feature Distribution by Category</CardTitle>
                    <CardDescription className="text-slate-400">
                      Breakdown of 39 features used in model training
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={Object.entries(features.categories).map(([category, data]: [string, any]) => ({
                          category: category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
                          count: data.count,
                          fullName: category
                        }))}
                        margin={{ bottom: 80, left: 20, right: 20, top: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="category"
                          stroke="#94a3b8"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          label={{ value: 'Number of Features', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                          formatter={(value: number) => [`${value} features`, 'Count']}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {Object.entries(features.categories).map((entry, index) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Feature Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(features.categories).map(([category, data]: [string, any], index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
                    const color = colors[index % colors.length]

                    return (
                      <Card key={category} className="bg-slate-800 border-slate-700">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-white text-sm">
                              {category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </CardTitle>
                            <Badge style={{ backgroundColor: color }} className="text-white">
                              {data.count}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {data.features.map((feature: string) => (
                              <div key={feature} className="text-xs text-slate-300 font-mono bg-slate-750 px-2 py-1 rounded">
                                {feature}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Preprocessing Pipeline</CardTitle>
                <CardDescription>Complete data preprocessing and feature engineering workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineSummary && pipelineSummary.steps ? (
                    pipelineSummary.steps.map((step: any) => (
                      <div
                        key={step.order}
                        className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">
                          {step.order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{step.method}</h4>
                            {step.enabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{step.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Default pipeline steps if summary not loaded */}
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">1</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Weather Data Merge</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Merge weather data (temperature, humidity, pressure, rainfall)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">2</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Data Cleaning</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Handle missing values and outliers</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">3</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Lag Features</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Historical water level lags: 1h, 2h, 3h, 6h, 12h, 24h (6 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">4</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Rolling Statistics</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Rolling mean and std over 3h, 6h, 12h, 24h windows (8 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">5</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Rate of Change</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Water level differences over 1h, 3h, 6h (3 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">6</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Rainfall Features</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Cumulative rainfall over 3h, 6h, 12h, 24h (4 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">7</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Time Features</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Hour, day, month, weekend + cyclical encoding (9 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">8</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Weather Interactions</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Temperature-humidity interaction, pressure differences (2 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">9</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Station Statistics</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Station mean, std, deviation from mean (4 features)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">10</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Target Creation</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Create prediction targets for 15, 30, 45, 60, 90 minute horizons</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">11</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Feature Scaling</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">StandardScaler normalization for all features</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-750 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold">12</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">Train/Test Split</h4>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </div>
                          <p className="text-xs text-slate-400">Time-based split with 80/20 train/test ratio</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Run Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Test Preprocessing Pipeline</CardTitle>
                <CardDescription>
                  Run preprocessing on a specific station and date range
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Station ID</Label>
                    <Input
                      type="number"
                      value={testStationId}
                      onChange={(e) => setTestStationId(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Start Date</Label>
                    <Input
                      type="date"
                      value={testStartDate}
                      onChange={(e) => setTestStartDate(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">End Date</Label>
                    <Input
                      type="date"
                      value={testEndDate}
                      onChange={(e) => setTestEndDate(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRunPreprocessing}
                  disabled={isRunning}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Preprocessing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Preprocessing
                    </>
                  )}
                </Button>

                {testResult && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-slate-750 border-slate-600">
                        <CardContent className="pt-4">
                          <p className="text-xs text-slate-400">Records Processed</p>
                          <p className="text-xl font-bold text-white">{testResult.records_processed}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-750 border-slate-600">
                        <CardContent className="pt-4">
                          <p className="text-xs text-slate-400">Features Generated</p>
                          <p className="text-xl font-bold text-white">{testResult.features_generated}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-750 border-slate-600">
                        <CardContent className="pt-4">
                          <p className="text-xs text-slate-400">Execution Time</p>
                          <p className="text-xl font-bold text-white">{testResult.execution_time_seconds}s</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-750 border-slate-600">
                        <CardContent className="pt-4">
                          <p className="text-xs text-slate-400">Records Removed</p>
                          <p className="text-xl font-bold text-white">{testResult.data_summary.records_removed}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-slate-750 border-slate-600">
                      <CardHeader>
                        <CardTitle className="text-white text-sm">Processing Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-green-400 font-semibold">{testResult.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Message:</span>
                          <span className="text-white">{testResult.message}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Station ID:</span>
                          <span className="text-white">{testResult.station_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Initial Records:</span>
                          <span className="text-white">{testResult.data_summary.initial_records}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Final Records:</span>
                          <span className="text-white">{testResult.data_summary.final_records}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date Range:</span>
                          <span className="text-white">
                            {new Date(testResult.data_summary.date_range.start).toLocaleDateString()} - {new Date(testResult.data_summary.date_range.end).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Count:</span>
                          <span className="text-white">{testResult.data_summary.target_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Missing Values:</span>
                          <span className="text-white">{testResult.data_summary.missing_values}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-slate-750 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-white text-sm">Prediction Horizons</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {testResult.prediction_horizons.map((h: number) => (
                              <Badge key={h} variant="secondary" className="bg-blue-600 text-white">
                                {h} hour{h > 1 ? 's' : ''}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-750 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-white text-sm">Configurations Used</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {testResult.configs_used.map((config: string) => (
                              <Badge key={config} variant="outline" className="border-green-600 text-green-400">
                                {config.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Config Editor Component
function ConfigEditor({ config, onSave, isSaving, methodId }: {
  config: any
  onSave: (config: any) => void
  isSaving: boolean
  methodId: string
}) {
  const [editedConfig, setEditedConfig] = useState(config)

  // Reset edited config when config prop changes
  useEffect(() => {
    setEditedConfig(config)
  }, [config])

  const handleChange = (key: string, value: any) => {
    setEditedConfig({
      ...editedConfig,
      [key]: value
    })
  }

  const handleNestedChange = (parentKey: string, childKey: string, value: any) => {
    setEditedConfig({
      ...editedConfig,
      [parentKey]: {
        ...editedConfig[parentKey],
        [childKey]: value
      }
    })
  }

  const handleSave = () => {
    onSave(editedConfig)
  }

  const renderField = (key: string, value: any) => {
    // Skip description and read-only fields
    if (key === 'description' || key === 'features_generated' || key === 'exclude_features' ||
      key === 'targets_generated' || key === 'weather_features' || key === 'features' ||
      key === 'windows' || key === 'statistics' || key === 'min_periods' ||
      key === 'lag_periods' || key === 'diff_periods' || key === 'cyclical_features' ||
      key === 'hour_cycle' || key === 'month_cycle' || key === 'accumulation_windows') {
      return null
    }

    // Special handling for training_data_range unit field (display only)
    if (key === 'unit' && methodId === 'training_data_range') {
      return null
    }

    // Handle note field for training_data_range
    if (key === 'note') {
      return (
        <div key={key} className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-xs text-blue-300">{value}</p>
        </div>
      )
    }

    // Handle months field for training_data_range with special styling
    if (key === 'months' && methodId === 'training_data_range') {
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300 text-sm">
              Training Data Range (Months)
            </Label>
            <span className="text-xs text-slate-400">{value} month{value !== 1 ? 's' : ''}</span>
          </div>
          <Input
            type="number"
            step={1}
            min={1}
            max={12}
            value={value}
            onChange={(e) => handleChange(key, parseInt(e.target.value))}
            className="bg-slate-700 border-slate-600 text-white"
          />
          <p className="text-xs text-slate-500">Number of recent months of data to use for training (1-12 months)</p>
        </div>
      )
    }

    // Handle nested objects for outlier_detection
    if (key === 'outlier_detection' && typeof value === 'object') {
      return (
        <div key={key} className="space-y-3 p-3 bg-slate-750 rounded border border-slate-600">
          <Label className="text-slate-300 text-sm font-semibold">Outlier Detection</Label>

          <div className="flex items-center justify-between">
            <Label className="text-slate-300 text-xs">Enable Outlier Detection</Label>
            <Switch
              checked={value.enabled || false}
              onCheckedChange={(checked) => handleNestedChange(key, 'enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Method</Label>
            <select
              value={value.method || 'iqr'}
              onChange={(e) => handleNestedChange(key, 'method', e.target.value)}
              className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
            >
              <option value="iqr">IQR (Interquartile Range)</option>
              <option value="zscore">Z-Score</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Threshold</Label>
            <Input
              type="number"
              step="0.1"
              value={value.threshold || 3.0}
              onChange={(e) => handleNestedChange(key, 'threshold', parseFloat(e.target.value))}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </div>
      )
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <Label className="text-slate-300 text-sm">
            {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Label>
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleChange(key, checked)}
          />
        </div>
      )
    }

    if (typeof value === 'number') {
      // Determine step based on field
      const step = key === 'test_size' ? 0.01 : key.includes('threshold') ? 0.1 : 1
      const min = key === 'test_size' ? 0.1 : key.includes('threshold') ? 0 : undefined
      const max = key === 'test_size' ? 0.5 : undefined

      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300 text-sm">
              {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Label>
            <span className="text-xs text-slate-400">{value}</span>
          </div>
          <Input
            type="number"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      )
    }

    if (typeof value === 'string') {
      // Handle date fields
      if (key === 'start_date' || key === 'end_date') {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-slate-300 text-sm">
              {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        )
      }

      // Use select for specific fields
      if (key === 'missing_value_strategy') {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-slate-300 text-sm">Missing Value Strategy</Label>
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2"
            >
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="forward_fill">Forward Fill</option>
              <option value="backward_fill">Backward Fill</option>
              <option value="drop">Drop Rows</option>
            </select>
          </div>
        )
      }

      if (key === 'method' && methodId === 'train_test_split') {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-slate-300 text-sm">Split Method</Label>
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2"
            >
              <option value="time_based">Time-Based Split</option>
              <option value="random">Random Split</option>
              <option value="stratified">Stratified Split</option>
            </select>
          </div>
        )
      }

      if (key === 'method' && methodId === 'feature_scaling') {
        return (
          <div key={key} className="space-y-2">
            <Label className="text-slate-300 text-sm">Scaling Method</Label>
            <select
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2"
            >
              <option value="standard">Standard Scaler</option>
              <option value="minmax">MinMax Scaler</option>
              <option value="robust">Robust Scaler</option>
            </select>
          </div>
        )
      }

      // Default string input for other fields
      return (
        <div key={key} className="space-y-2">
          <Label className="text-slate-300 text-sm">
            {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </Label>
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      {Object.entries(editedConfig).map(([key, value]) => renderField(key, value))}

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </>
        )}
      </Button>
    </div>
  )
}
