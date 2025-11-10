"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MapView } from "@/components/dashboard/map-view"
import { AlertCircle, Save, RotateCcw } from "lucide-react"

interface TuneParametersPageProps {
  role: "expert" | "admin"
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

export function TuneParametersPage({ role, onNavigate, onLogout }: TuneParametersPageProps) {
  const [selectedStation, setSelectedStation] = useState("Chiang Khong")
  const [selectedModel, setSelectedModel] = useState("arima")
  const [parameters, setParameters] = useState({
    p: 2,
    d: 1,
    q: 1,
    seasonal: true,
    lookback: 30,
    learningRate: 0.001,
    epochs: 100,
    batchSize: 32,
  })
  const [saved, setSaved] = useState(false)

  const modelConfigs: Record<string, { label: string; params: string[] }> = {
    arima: {
      label: "ARIMA",
      params: ["p", "d", "q", "seasonal"],
    },
    lstm: {
      label: "LSTM Neural Network",
      params: ["lookback", "learningRate", "epochs", "batchSize"],
    },
    hybrid: {
      label: "Hybrid ARIMA-LSTM",
      params: ["p", "d", "q", "lookback", "learningRate", "epochs"],
    },
  }

  const handleParameterChange = (param: string, value: number | boolean) => {
    setParameters({ ...parameters, [param]: value })
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setParameters({
      p: 2,
      d: 1,
      q: 1,
      seasonal: true,
      lookback: 30,
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
    })
  }

  const config = modelConfigs[selectedModel]
  const visibleParams = config.params

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="tune" role={role} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Model Parameter Tuning" role={role} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Parameter Tuning Guidelines</p>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust hyperparameters to optimize model accuracy for specific monitoring stations. Changes are saved
                  per station.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Left: Station Map */}
              <div className="col-span-2 space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monitoring Stations</CardTitle>
                    <CardDescription className="text-slate-400">Select station to tune parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MapView onStationSelect={setSelectedStation} />
                  </CardContent>
                </Card>

                {/* Model Selection */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Select Forecasting Model</CardTitle>
                    <CardDescription className="text-slate-400">Choose model for {selectedStation}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(modelConfigs).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedModel(key)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedModel === key
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                          }`}
                        >
                          <p className="text-sm font-medium text-white">{config.label}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Parameter Controls */}
              <div className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-base">{config.label} Parameters</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Station: {selectedStation}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* ARIMA Parameters */}
                    {visibleParams.includes("p") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">AR Order (p)</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={parameters.p}
                            onChange={(e) => handleParameterChange("p", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-8">{parameters.p}</span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("d") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Differencing (d)</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="0"
                            max="3"
                            value={parameters.d}
                            onChange={(e) => handleParameterChange("d", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-8">{parameters.d}</span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("q") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">MA Order (q)</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={parameters.q}
                            onChange={(e) => handleParameterChange("q", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-8">{parameters.q}</span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("seasonal") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Seasonal Component</label>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleParameterChange("seasonal", !parameters.seasonal)}
                            className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                              parameters.seasonal
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {parameters.seasonal ? "Enabled" : "Disabled"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LSTM Parameters */}
                    {visibleParams.includes("lookback") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Lookback Window</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="7"
                            max="60"
                            step="7"
                            value={parameters.lookback}
                            onChange={(e) => handleParameterChange("lookback", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-12">{parameters.lookback}d</span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("learningRate") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Learning Rate</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="-4"
                            max="-2"
                            step="0.1"
                            value={Math.log10(parameters.learningRate)}
                            onChange={(e) =>
                              handleParameterChange("learningRate", Math.pow(10, Number.parseFloat(e.target.value)))
                            }
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-12">
                            {parameters.learningRate.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("epochs") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Training Epochs</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="50"
                            max="500"
                            step="50"
                            value={parameters.epochs}
                            onChange={(e) => handleParameterChange("epochs", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-12">{parameters.epochs}</span>
                        </div>
                      </div>
                    )}

                    {visibleParams.includes("batchSize") && (
                      <div>
                        <label className="text-xs font-medium text-slate-300">Batch Size</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="range"
                            min="8"
                            max="64"
                            step="8"
                            value={parameters.batchSize}
                            onChange={(e) => handleParameterChange("batchSize", Number.parseInt(e.target.value))}
                            className="flex-1 h-2 bg-slate-700 rounded-lg accent-blue-500"
                          />
                          <span className="text-sm font-mono text-blue-400 w-8">{parameters.batchSize}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-2 border-t border-slate-700">
                      <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <Save className="w-4 h-4 mr-2" />
                        Save Parameters
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset to Default
                      </Button>
                    </div>

                    {saved && (
                      <div className="bg-green-900/30 border border-green-700 rounded p-2 text-center">
                        <p className="text-xs text-green-300 font-medium">Parameters saved successfully</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
