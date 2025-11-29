"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EvaluationMetrics } from "@/components/evaluation/evaluation-metrics"
import { AccuracyChart } from "@/components/evaluation/accuracy-chart"
import { ErrorDistribution } from "@/components/evaluation/error-distribution"
import { getEvaluationMetrics } from "@/app/actions/analysis-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegressionAnalysisPage } from "@/components/pages/regression-analysis"

interface ModelEvaluationPageProps {
  role: "expert" | "admin"
}

export function ModelEvaluationPage({ role }: ModelEvaluationPageProps) {
  const [metrics, setMetrics] = useState<any[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await getEvaluationMetrics()
      setMetrics(data || [])
    }
    fetchMetrics()
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Model Evaluation & Analysis</h2>
            <p className="text-slate-400">Analyze model performance and regression metrics</p>
          </div>
        </div>

        <Tabs defaultValue="evaluation" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="evaluation">Model Evaluation</TabsTrigger>
            <TabsTrigger value="regression">Regression Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="evaluation" className="space-y-6">
            {/* Key Metrics */}
            <EvaluationMetrics />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      {metrics.length > 0 ? (
                        metrics.map((model) => (
                          <tr key={model.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-slate-100 font-medium">{model.model_type}</td>
                            <td className="text-center py-3 px-4 text-slate-300">{model.rmse?.toFixed(3)}</td>
                            <td className="text-center py-3 px-4 text-slate-300">{model.mae?.toFixed(3)}</td>
                            <td className="text-center py-3 px-4 text-slate-300">{model.r2?.toFixed(2)}</td>
                            <td className="text-center py-3 px-4">
                              <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs font-medium">
                                {((1 - (model.mape || 0)) * 100).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No performance data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regression">
            <RegressionAnalysisPage role={role} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
