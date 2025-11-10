"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Settings, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react"

interface PreprocessingConfigPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

interface PreprocessingMethod {
  id: string
  name: string
  enabled: boolean
  description: string
  parameters: Record<string, { label: string; value: number | string; min?: number; max?: number; step?: number }>
}

export function PreprocessingConfigPage({ onNavigate, onLogout }: PreprocessingConfigPageProps) {
  const [methods, setMethods] = useState<PreprocessingMethod[]>([
    {
      id: "outlier",
      name: "Outlier Detection & Removal",
      enabled: true,
      description: "Detect and handle anomalous data points using statistical methods",
      parameters: {
        method: {
          label: "Detection Method",
          value: "iqr",
        },
        threshold: {
          label: "Sensitivity (σ)",
          value: 3,
          min: 1,
          max: 5,
          step: 0.5,
        },
        action: {
          label: "Action on Outlier",
          value: "interpolate",
        },
      },
    },
    {
      id: "missing",
      name: "Missing Data Handling",
      enabled: true,
      description: "Fill or remove records with missing values",
      parameters: {
        maxGapHours: {
          label: "Max Gap (hours)",
          value: 24,
          min: 1,
          max: 168,
          step: 1,
        },
        method: {
          label: "Fill Method",
          value: "linear-interpolation",
        },
        removePercentage: {
          label: "Remove if >% missing",
          value: 30,
          min: 5,
          max: 100,
          step: 5,
        },
      },
    },
    {
      id: "smoothing",
      name: "Data Smoothing",
      enabled: true,
      description: "Apply temporal smoothing to reduce noise",
      parameters: {
        method: {
          label: "Smoothing Method",
          value: "moving-average",
        },
        windowSize: {
          label: "Window Size (hours)",
          value: 3,
          min: 1,
          max: 12,
          step: 1,
        },
        weight: {
          label: "Smoothing Factor",
          value: 0.5,
          min: 0,
          max: 1,
          step: 0.1,
        },
      },
    },
    {
      id: "normalization",
      name: "Data Normalization",
      enabled: true,
      description: "Standardize values to consistent scale",
      parameters: {
        method: {
          label: "Normalization Method",
          value: "z-score",
        },
        referenceStation: {
          label: "Reference Station",
          value: "Chiang Khong",
        },
      },
    },
    {
      id: "validation",
      name: "Data Validation Rules",
      enabled: true,
      description: "Apply domain-specific validation constraints",
      parameters: {
        minValue: {
          label: "Minimum Value (meters)",
          value: 0.5,
          min: 0,
          max: 5,
          step: 0.1,
        },
        maxValue: {
          label: "Maximum Value (meters)",
          value: 15,
          min: 10,
          max: 20,
          step: 0.5,
        },
        maxChangeRate: {
          label: "Max Change Rate (m/hour)",
          value: 0.5,
          min: 0.1,
          max: 2,
          step: 0.1,
        },
      },
    },
    {
      id: "timestamp",
      name: "Timestamp Standardization",
      enabled: true,
      description: "Ensure consistent timestamp format and timezone",
      parameters: {
        timezone: {
          label: "Timezone",
          value: "UTC+7",
        },
        format: {
          label: "Format",
          value: "ISO8601",
        },
        alignmentInterval: {
          label: "Alignment Interval (minutes)",
          value: 15,
          min: 5,
          max: 60,
          step: 5,
        },
      },
    },
  ])

  const [expandedMethod, setExpandedMethod] = useState<string | null>("outlier")
  const [saved, setSaved] = useState(false)

  const handleToggleMethod = (id: string) => {
    setMethods(methods.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
    setSaved(false)
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
    setSaved(false)
  }

  const handleSaveConfig = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleResetToDefault = () => {
    if (confirm("Reset all preprocessing configurations to default values?")) {
      location.reload()
    }
  }

  const enabledMethodsCount = methods.filter((m) => m.enabled).length

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="preprocessing" role="admin" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Data Preprocessing Configuration" role="admin" />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
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
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 bg-blue-900/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium border border-blue-700/50">
                      <Settings className="w-4 h-4" />
                      Advanced Config
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Banner */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
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
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleMethod(method.id)
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          method.enabled ? "bg-blue-600" : "bg-slate-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            method.enabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white">{method.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{method.description}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition ${
                        expandedMethod === method.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded Parameters */}
                  {expandedMethod === method.id && (
                    <div className="border-t border-slate-700 p-4 space-y-4">
                      {Object.entries(method.parameters).map(([key, param]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-300">{param.label}</label>
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
                            <select
                              value={param.value}
                              onChange={(e) => handleParameterChange(method.id, key, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                            >
                              {key === "method" && method.id === "outlier" && (
                                <>
                                  <option value="iqr">Interquartile Range (IQR)</option>
                                  <option value="zscore">Z-Score</option>
                                  <option value="mad">Median Absolute Deviation</option>
                                </>
                              )}
                              {key === "action" && method.id === "outlier" && (
                                <>
                                  <option value="interpolate">Interpolate</option>
                                  <option value="remove">Remove</option>
                                  <option value="flag">Flag Only</option>
                                </>
                              )}
                              {key === "method" && method.id === "missing" && (
                                <>
                                  <option value="linear-interpolation">Linear Interpolation</option>
                                  <option value="forward-fill">Forward Fill</option>
                                  <option value="mean">Mean Value</option>
                                  <option value="remove">Remove Records</option>
                                </>
                              )}
                              {key === "method" && method.id === "smoothing" && (
                                <>
                                  <option value="moving-average">Moving Average</option>
                                  <option value="exponential">Exponential Smoothing</option>
                                  <option value="gaussian">Gaussian Kernel</option>
                                </>
                              )}
                              {key === "method" && method.id === "normalization" && (
                                <>
                                  <option value="z-score">Z-Score Normalization</option>
                                  <option value="min-max">Min-Max Scaling</option>
                                  <option value="robust">Robust Scaling</option>
                                </>
                              )}
                              {key === "referenceStation" && (
                                <>
                                  <option value="Chiang Khong">Chiang Khong</option>
                                  <option value="Vientiane">Vientiane</option>
                                  <option value="Nakhon Phanom">Nakhon Phanom</option>
                                  <option value="Mukdahan">Mukdahan</option>
                                  <option value="Pakse">Pakse</option>
                                </>
                              )}
                              {key === "timezone" && (
                                <>
                                  <option value="UTC+7">UTC+7 (Bangkok)</option>
                                  <option value="UTC+6">UTC+6 (Bangkok)</option>
                                  <option value="UTC">UTC</option>
                                </>
                              )}
                              {key === "format" && (
                                <>
                                  <option value="ISO8601">ISO 8601</option>
                                  <option value="Unix">Unix Timestamp</option>
                                </>
                              )}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 sticky bottom-6">
              <Button
                onClick={handleSaveConfig}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Configuration
              </Button>
              <Button
                onClick={handleResetToDefault}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                Reset to Defaults
              </Button>
            </div>

            {/* Saved Notification */}
            {saved && (
              <div className="fixed bottom-6 right-6 bg-green-900/90 border border-green-700/50 text-green-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Configuration saved successfully!
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
