"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { EvaluationMetrics } from "@/components/evaluation/evaluation-metrics"
import { AccuracyChart } from "@/components/evaluation/accuracy-chart"
import { ErrorDistribution } from "@/components/evaluation/error-distribution"

interface ModelEvaluationPageProps {
  role: "expert" | "admin"
  onNavigate: (page: "guest" | "expert" | "evaluation" | "admin" | "tune" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

export function ModelEvaluationPage({ role, onNavigate, onLogout }: ModelEvaluationPageProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="evaluation" role={role} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Model Evaluation & Analysis" role={role} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Key Metrics */}
            <EvaluationMetrics />

            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Forecast Accuracy by Station</CardTitle>
                  <CardDescription className="text-slate-400">
                    Historical RMSE comparison across all monitoring stations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AccuracyChart />
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Error Distribution</CardTitle>
                  <CardDescription className="text-slate-400">
                    Forecast error analysis over 30-day period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorDistribution />
                </CardContent>
              </Card>
            </div>

            {/* Model Performance Table */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Model Performance Comparison</CardTitle>
                <CardDescription className="text-slate-400">
                  Detailed metrics for each forecasting model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Model</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">RMSE</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">MAE</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">R²</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Hybrid Model", rmse: "0.234", mae: "0.156", r2: "0.94", accuracy: "94.2%" },
                        { name: "LSTM Model", rmse: "0.267", mae: "0.189", r2: "0.91", accuracy: "91.5%" },
                        { name: "Statistical", rmse: "0.312", mae: "0.245", r2: "0.87", accuracy: "87.8%" },
                      ].map((model) => (
                        <tr key={model.name} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-slate-100 font-medium">{model.name}</td>
                          <td className="text-center py-3 px-4 text-slate-300">{model.rmse}</td>
                          <td className="text-center py-3 px-4 text-slate-300">{model.mae}</td>
                          <td className="text-center py-3 px-4 text-slate-300">{model.r2}</td>
                          <td className="text-center py-3 px-4">
                            <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs font-medium">
                              {model.accuracy}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
