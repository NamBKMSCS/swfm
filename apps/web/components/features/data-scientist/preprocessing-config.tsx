"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { AlertCircle, ChevronDown, Loader2, Save, Play } from "lucide-react"
import { getPreprocessingConfigs, savePreprocessingConfig } from "@/app/actions/preprocessing-actions"
import { toast } from "sonner"

interface PreprocessingMethod {
  id: string
  name: string
  enabled: boolean
  description: string
  parameters: Record<string, { label: string; value: number | string; min?: number; max?: number; step?: number }>
}

const defaultMethods: PreprocessingMethod[] = [
  {
    id: "outlier",
    name: "Outlier Detection & Removal",
    enabled: true,
    description: "Detect and handle anomalous data points using statistical methods",
    parameters: {
      method: { label: "Detection Method", value: "iqr" },
      threshold: { label: "Sensitivity (σ)", value: 3, min: 1, max: 5, step: 0.5 },
      action: { label: "Action on Outlier", value: "interpolate" },
    },
  },
  {
    id: "missing",
    name: "Missing Data Handling",
    enabled: true,
    description: "Fill or remove records with missing values",
    parameters: {
      maxGapHours: { label: "Max Gap (hours)", value: 24, min: 1, max: 168, step: 1 },
      method: { label: "Fill Method", value: "linear-interpolation" },
      removePercentage: { label: "Remove if >% missing", value: 30, min: 5, max: 100, step: 5 },
    },
  },
  {
    id: "smoothing",
    name: "Data Smoothing",
    enabled: true,
    description: "Apply temporal smoothing to reduce noise",
    parameters: {
      method: { label: "Smoothing Method", value: "moving-average" },
      windowSize: { label: "Window Size (hours)", value: 3, min: 1, max: 12, step: 1 },
      weight: { label: "Smoothing Factor", value: 0.5, min: 0, max: 1, step: 0.1 },
    },
  },
  {
    id: "normalization",
    name: "Data Normalization",
    enabled: true,
    description: "Standardize values to consistent scale",
    parameters: {
      method: { label: "Normalization Method", value: "z-score" },
      referenceStation: { label: "Reference Station", value: "Jinghong" },
    },
  },
  {
    id: "validation",
    name: "Data Validation Rules",
    enabled: true,
    description: "Apply domain-specific validation constraints",
    parameters: {
      minValue: { label: "Minimum Value (meters)", value: 0.5, min: 0, max: 5, step: 0.1 },
      maxValue: { label: "Maximum Value (meters)", value: 15, min: 10, max: 20, step: 0.5 },
      maxChangeRate: { label: "Max Change Rate (m/hour)", value: 0.5, min: 0.1, max: 2, step: 0.1 },
    },
  },
  {
    id: "timestamp",
    name: "Timestamp Standardization",
    enabled: true,
    description: "Ensure consistent timestamp format and timezone",
    parameters: {
      timezone: { label: "Timezone", value: "UTC+7" },
      format: { label: "Format", value: "ISO8601" },
      alignmentInterval: { label: "Alignment Interval (minutes)", value: 15, min: 5, max: 60, step: 5 },
    },
  },
]

export function PreprocessingConfigPage() {
  const [methods, setMethods] = useState<PreprocessingMethod[]>(defaultMethods)
  const [expandedMethod, setExpandedMethod] = useState<string | null>("outlier")
  const [isPending, startTransition] = useTransition()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const configs = await getPreprocessingConfigs()
      if (configs && configs.length > 0) {
        // Merge loaded configs with default structure
        const updatedMethods = defaultMethods.map(method => {
          const savedConfig = configs.find((c: any) => c.method_id === method.id)
          if (savedConfig) {
            return {
              ...method,
              enabled: savedConfig.enabled ?? false,
              parameters: {
                ...method.parameters,
                ...(savedConfig.config as object || {})
              }
            }
          }
          return method
        })
        setMethods(updatedMethods)
      }
    } catch (error) {
      console.error("Error loading preprocessing configs:", error)
      toast.error("Failed to load configurations")
    }
  }

  const handleToggleMethod = (id: string) => {
    setMethods(methods.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
  }

  const handleParameterChange = (methodId: string, paramKey: string, value: number | string) => {
    setMethods(
      methods.map((m) => {
        if (m.id === methodId) {
          return {
            ...m,
            parameters: {
              ...m.parameters,
              [paramKey]: {
                ...m.parameters[paramKey],
                value,
              },
            },
          }
        }
        return m
      }),
    )
  }

  const handleSaveConfig = () => {
    startTransition(async () => {
      try {
        // Save each method config
        await Promise.all(methods.map(method =>
          savePreprocessingConfig(method.id, method.enabled, method.parameters)
        ))
        toast.success("Configuration saved successfully")
      } catch (error) {
        console.error("Error saving config:", error)
        toast.error("Failed to save configuration")
      }
    })
  }

  const enabledMethodsCount = methods.filter((m) => m.enabled).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Preprocessing Configuration</h2>
            <p className="text-slate-400">Configure data cleaning and transformation pipeline</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveConfig} disabled={isPending} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Config
            </Button>
          </div>
        </div>

        {/* Overview Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Preprocessing Pipeline</h3>
                <p className="text-2xl font-bold text-white">{enabledMethodsCount} methods active</p>
                <p className="text-xs text-slate-400 mt-2">
                  Data automatically preprocessed when synced from monitoring.mrcmekong.org
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Configuration Impact</p>
            <p className="text-xs text-slate-400 mt-1">
              Changes apply to new data synced after saving. Historical data can be reprocessed from Data
              Management.
            </p>
          </div>
        </div>

        {/* Preprocessing Methods */}
        <div className="space-y-3">
          {methods.map((method) => (
            <Card key={method.id} className="bg-slate-800 border-slate-700">
              <div
                onClick={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                className="cursor-pointer p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
              >
                <Field orientation="horizontal" className="flex-1">
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <Switch
                      id={`switch-${method.id}`}
                      checked={method.enabled}
                      onCheckedChange={() => handleToggleMethod(method.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <FieldLabel htmlFor={`switch-${method.id}`} className="text-sm font-semibold text-white cursor-pointer">
                      {method.name}
                    </FieldLabel>
                    <p className="text-xs text-slate-400 mt-1">{method.description}</p>
                  </div>
                </Field>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition ${expandedMethod === method.id ? "rotate-180" : ""
                    }`}
                />
              </div>

              {/* Expanded Parameters */}
              {expandedMethod === method.id && (
                <div className="border-t border-slate-700 p-4">
                  <FieldGroup>
                    {Object.entries(method.parameters).map(([key, param]) => (
                      <Field key={key}>
                        <div className="flex items-center justify-between mb-2">
                          <FieldLabel className="text-xs font-medium text-slate-300">{param.label}</FieldLabel>
                          {typeof param.value === "number" && (
                            <span className="text-xs font-mono text-slate-400">{param.value}</span>
                          )}
                        </div>

                        {typeof param.value === "number" ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={param.min || 0}
                              max={param.max || 100}
                              step={param.step || 1}
                              value={param.value}
                              onChange={(e) =>
                                handleParameterChange(method.id, key, Number.parseFloat(e.target.value))
                              }
                              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input
                              type="number"
                              min={param.min || 0}
                              max={param.max || 100}
                              step={param.step || 1}
                              value={param.value}
                              onChange={(e) =>
                                handleParameterChange(method.id, key, Number.parseFloat(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                            />
                          </div>
                        ) : (
                          <Select
                            value={param.value}
                            onValueChange={(value) => handleParameterChange(method.id, key, value)}
                          >
                            <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {key === "method" && method.id === "outlier" && (
                                <>
                                  <SelectItem value="iqr">Interquartile Range (IQR)</SelectItem>
                                  <SelectItem value="zscore">Z-Score</SelectItem>
                                  <SelectItem value="mad">Median Absolute Deviation</SelectItem>
                                </>
                              )}
                              {key === "action" && method.id === "outlier" && (
                                <>
                                  <SelectItem value="interpolate">Interpolate</SelectItem>
                                  <SelectItem value="remove">Remove</SelectItem>
                                  <SelectItem value="flag">Flag Only</SelectItem>
                                </>
                              )}
                              {key === "method" && method.id === "missing" && (
                                <>
                                  <SelectItem value="linear-interpolation">Linear Interpolation</SelectItem>
                                  <SelectItem value="forward-fill">Forward Fill</SelectItem>
                                  <SelectItem value="mean">Mean Value</SelectItem>
                                  <SelectItem value="remove">Remove Records</SelectItem>
                                </>
                              )}
                              {key === "method" && method.id === "smoothing" && (
                                <>
                                  <SelectItem value="moving-average">Moving Average</SelectItem>
                                  <SelectItem value="exponential">Exponential Smoothing</SelectItem>
                                  <SelectItem value="gaussian">Gaussian Kernel</SelectItem>
                                </>
                              )}
                              {key === "method" && method.id === "normalization" && (
                                <>
                                  <SelectItem value="z-score">Z-Score Normalization</SelectItem>
                                  <SelectItem value="min-max">Min-Max Scaling</SelectItem>
                                  <SelectItem value="robust">Robust Scaling</SelectItem>
                                </>
                              )}
                              {key === "referenceStation" && (
                                <>
                                  <SelectItem value="Jinghong">Jinghong</SelectItem>
                                  <SelectItem value="Chiang Saen">Chiang Saen</SelectItem>
                                  <SelectItem value="Luang Prabang">Luang Prabang</SelectItem>
                                  <SelectItem value="Vientiane">Vientiane</SelectItem>
                                  <SelectItem value="Pakse">Pakse</SelectItem>
                                  <SelectItem value="Stung Treng">Stung Treng</SelectItem>
                                  <SelectItem value="Kratie">Kratie</SelectItem>
                                  <SelectItem value="Tan Chau">Tan Chau</SelectItem>
                                  <SelectItem value="Châu Đốc">Châu Đốc</SelectItem>
                                </>
                              )}
                              {key === "timezone" && (
                                <>
                                  <SelectItem value="UTC+7">UTC+7 (Bangkok)</SelectItem>
                                  <SelectItem value="UTC+6">UTC+6 (Bangkok)</SelectItem>
                                  <SelectItem value="UTC">UTC</SelectItem>
                                </>
                              )}
                              {key === "format" && (
                                <>
                                  <SelectItem value="ISO8601">ISO 8601</SelectItem>
                                  <SelectItem value="Unix">Unix Timestamp</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                    ))}
                  </FieldGroup>
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
