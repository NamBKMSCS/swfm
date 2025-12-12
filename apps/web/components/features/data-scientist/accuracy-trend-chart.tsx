"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getEvaluationMetrics } from "@/app/actions/analysis-actions"
import { Loader2 } from "lucide-react"

const COLORS = {
  '15min': '#3B82F6', // blue
  '30min': '#10B981', // green
  '45min': '#F59E0B', // orange
  '60min': '#EF4444', // red
}

export function AccuracyTrendChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedHorizon, setSelectedHorizon] = useState("15min")

  useEffect(() => {
    loadData()
  }, [selectedHorizon])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const metrics = await getEvaluationMetrics()

      console.log("All metrics:", metrics)
      console.log("Selected horizon:", selectedHorizon)

      // Filter by selected horizon
      const filtered = metrics.filter((m: any) => {
        if (!m.evaluated_at || m.r2 === null) return false

        // Extract horizon from model_type (e.g., "Linear 15min", "Ridge 30min", etc.)
        const horizonMatch = m.model_type?.match(/(\d+)\s*min/i)
        if (!horizonMatch) return false

        const horizon = `${horizonMatch[1]}min`
        return horizon === selectedHorizon
      })

      // Sort by date, take 10 most recent
      const sorted = filtered
        .sort((a: any, b: any) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime())
        .slice(0, 10)
        .reverse()

      // Format data for chart
      const chartData = sorted.map((m: any) => {
        const date = new Date(m.evaluated_at)
        return {
          timestamp: date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          accuracy: parseFloat((m.r2 * 100).toFixed(2)),
          r2: m.r2,
          rmse: m.rmse,
          mae: m.mae,
          model: m.model_type,
          date: date
        }
      })

      console.log("Chart data:", chartData)
      setData(chartData)
    } catch (error) {
      console.error("Failed to load accuracy trend data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-semibold mb-1">{data.model}</p>
          <p className="text-slate-300 text-sm mb-2">{data.timestamp}</p>
          <p className="font-medium" style={{ color: COLORS[selectedHorizon as keyof typeof COLORS] }}>
            Accuracy: {data.accuracy.toFixed(2)}%
          </p>
          <p className="text-slate-400 text-xs mt-1">RMSE: {data.rmse?.toFixed(3)}</p>
          <p className="text-slate-400 text-xs">MAE: {data.mae?.toFixed(3)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white">Model Accuracy Trend Over Time</CardTitle>
            <CardDescription className="text-slate-400">
              Track accuracy (R² score) changes for selected prediction horizon
            </CardDescription>
          </div>
          <div className="w-48">
            <Label className="text-slate-300 text-xs mb-1 block">Prediction Horizon</Label>
            <Select value={selectedHorizon} onValueChange={setSelectedHorizon}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="15min">15 minutes</SelectItem>
                <SelectItem value="30min">30 minutes</SelectItem>
                <SelectItem value="45min">45 minutes</SelectItem>
                <SelectItem value="60min">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-slate-400">
            <p>No evaluation data available for {selectedHorizon.replace('min', ' minute')} predictions</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timestamp"
                stroke="#94A3B8"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#94A3B8"
                label={{ value: 'Accuracy (R² %)', angle: -90, position: 'insideLeft', fill: '#94A3B8' }}
                domain={['auto', 'auto']}
                scale="linear"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={COLORS[selectedHorizon as keyof typeof COLORS]}
                strokeWidth={2}
                dot={{ fill: COLORS[selectedHorizon as keyof typeof COLORS], r: 4 }}
                activeDot={{ r: 6 }}
                name={`Accuracy (${selectedHorizon.replace('min', ' min')})`}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Evaluations</p>
              <p className="text-white font-semibold">{data.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Latest Accuracy</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[selectedHorizon as keyof typeof COLORS] }} />
                <p className="text-white font-semibold">{data[data.length - 1]?.accuracy.toFixed(2)}%</p>
              </div>
            </div>
            <div>
              <p className="text-slate-400">Average Accuracy</p>
              <p className="text-white font-semibold">
                {(data.reduce((sum, d) => sum + d.accuracy, 0) / data.length).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-slate-400">Trend</p>
              <p className="text-white font-semibold">
                {data.length > 1
                  ? (data[data.length - 1].accuracy - data[0].accuracy) > 0
                    ? '📈 Improving'
                    : '📉 Declining'
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
