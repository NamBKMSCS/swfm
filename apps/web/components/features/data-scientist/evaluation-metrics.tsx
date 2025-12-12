"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react"
import { getAggregatedEvaluationMetrics } from "@/app/actions/chart-actions"

export function EvaluationMetrics() {
  const [metricsData, setMetricsData] = useState({
    avgAccuracy: 0,
    avgPrecision: 0,
    avgRmse: 0,
    activeStations: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAggregatedEvaluationMetrics()
        setMetricsData(data)
      } catch (error) {
        console.error('Error fetching evaluation metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const metrics = [
    {
      label: "Avg Accuracy (R²)",
      value: isLoading ? "..." : metricsData.avgAccuracy > 0 ? `${metricsData.avgAccuracy.toFixed(1)}%` : "N/A",
      icon: Target,
      trend: "up"
    },
    {
      label: "Avg R² Score",
      value: isLoading ? "..." : metricsData.avgPrecision > 0 ? metricsData.avgPrecision.toFixed(3) : "N/A",
      icon: Activity,
      trend: "up"
    },
    {
      label: "Avg RMSE",
      value: isLoading ? "..." : metricsData.avgRmse > 0 ? metricsData.avgRmse.toFixed(3) : "N/A",
      icon: TrendingDown,
      trend: "down"
    },
    {
      label: "Active Stations",
      value: isLoading ? "..." : metricsData.activeStations.toString(),
      icon: TrendingUp,
      trend: "up"
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.label} className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{metric.label}</p>
                  <p className="text-2xl font-bold text-white mt-2">{metric.value}</p>
                </div>
                <Icon className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
