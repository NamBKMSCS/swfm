"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EvaluationMetrics } from "@/components/features/data-scientist/evaluation-metrics"
import { AccuracyTrendChart } from "@/components/features/data-scientist/accuracy-trend-chart"
import { getEvaluationMetrics } from "@/app/actions/analysis-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react"


export function ModelEvaluationPage() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await getEvaluationMetrics()
      setMetrics(data || [])
    }
    fetchMetrics()
  }, [])

  // Calculate accuracy changes
  const metricsWithChanges = metrics.map((model, index) => {
    // Find previous evaluation of the same model type
    const previousModel = metrics
      .slice(index + 1)
      .find(m => m.model_type === model.model_type)

    let accuracyChange = null
    if (previousModel && model.r2 !== null && previousModel.r2 !== null) {
      accuracyChange = ((model.r2 - previousModel.r2) / Math.abs(previousModel.r2)) * 100
    }

    console.log('Model:', model.model_type, 'R²:', model.r2, 'Previous R²:', previousModel?.r2, 'Change:', accuracyChange)

    return {
      ...model,
      accuracyChange
    }
  })

  // Pagination
  const totalPages = Math.ceil(metricsWithChanges.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMetrics = metricsWithChanges.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

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

            {/* Accuracy Trend Over Time Chart */}
            <AccuracyTrendChart />

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
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Model Name</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Date</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Time</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">RMSE</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">MAE</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Accuracy (R²)</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMetrics.length > 0 ? (
                        currentMetrics.map((model) => {
                          const evaluatedDate = model.evaluated_at ? new Date(model.evaluated_at) : null
                          const date = evaluatedDate ? evaluatedDate.toLocaleDateString() : 'N/A'
                          const time = evaluatedDate ? evaluatedDate.toLocaleTimeString() : 'N/A'
                          const accuracyPercent = model.r2 !== null ? (model.r2 * 100).toFixed(2) : 'N/A'

                          return (
                            <tr key={model.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                              <td className="py-3 px-4 text-slate-100 font-medium">{model.model_type}</td>
                              <td className="text-center py-3 px-4 text-slate-300">{date}</td>
                              <td className="text-center py-3 px-4 text-slate-300">{time}</td>
                              <td className="text-center py-3 px-4 text-slate-300">{model.rmse?.toFixed(3) ?? 'N/A'}</td>
                              <td className="text-center py-3 px-4 text-slate-300">{model.mae?.toFixed(3) ?? 'N/A'}</td>
                              <td className="text-center py-3 px-4">
                                <span className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs font-medium">
                                  {accuracyPercent}%
                                </span>
                              </td>
                              <td className="text-center py-3 px-4">
                                {model.accuracyChange !== null ? (
                                  <div className="flex items-center justify-center gap-1">
                                    {model.accuracyChange > 0 ? (
                                      <>
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                        <span className="text-green-400 font-medium">
                                          +{model.accuracyChange.toFixed(2)}%
                                        </span>
                                      </>
                                    ) : model.accuracyChange < 0 ? (
                                      <>
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                        <span className="text-red-400 font-medium">
                                          {model.accuracyChange.toFixed(2)}%
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Minus className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-400">0%</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs">No previous</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">
                            No performance data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                    <div className="text-sm text-slate-400">
                      Showing {startIndex + 1} to {Math.min(endIndex, metricsWithChanges.length)} of {metricsWithChanges.length} models
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="text-sm text-slate-300">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
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
