"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from "recharts"
import { getRegressionAnalysis } from "@/app/actions/analysis-actions"

interface RegressionAnalysisProps {
  role: "expert" | "admin"
}

export function RegressionAnalysisPage({ role }: RegressionAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRegressionAnalysis()
      setAnalysisData(data || [])
    }
    fetchData()
  }, [])

  // Feature importance data - showing the impact level of each feature
  const featureImportanceData = [
    { feature: "Current Water Level", importance: 0.35, type: "Numerical" },
    { feature: "3-Day Rainfall", importance: 0.28, type: "Numerical" },
    { feature: "7-Day Lagged Level", importance: 0.18, type: "Numerical" },
    { feature: "Temperature", importance: 0.08, type: "Numerical" },
    { feature: "Humidity", importance: 0.06, type: "Numerical" },
    { feature: "Season", importance: 0.05, type: "Categorical" },
  ]

  // Residual distribution
  const residualData = [
    { range: "-0.2", count: 2 },
    { range: "-0.1", count: 8 },
    { range: "0", count: 45 },
    { range: "0.1", count: 12 },
    { range: "0.2", count: 3 },
  ]

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-2">Regression Analysis - Mekong River Basin</h3>
        <p className="text-slate-400 text-sm">
          Analyze the impact level of features on water level forecast results across monitoring stations. 
          Regression models help understand the relationship between input features and output predictions.
        </p>
      </div>

      {/* Feature Importance */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Feature Importance (Impact Level Analysis)</CardTitle>
          <CardDescription className="text-slate-400">
            Factors affecting water level forecast results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportanceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="feature" type="category" width={150} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
              />
              <Bar dataKey="importance" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 grid grid-cols-3 gap-4">
            {featureImportanceData.slice(0, 3).map((item) => (
              <div key={item.feature} className="bg-slate-700 rounded p-3">
                <p className="text-xs text-slate-400">{item.feature}</p>
                <p className="text-lg font-bold text-blue-400 mt-1">
                  {(item.importance * 100).toFixed(1)}%
                </p>
                <span className="text-xs text-slate-500">{item.type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Actual vs Predicted Scatter Plot */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Actual vs Predicted Values</CardTitle>
            <CardDescription className="text-slate-400">
              Comparison across stations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  type="number" 
                  dataKey="actual_value" 
                  name="Actual" 
                  stroke="#94a3b8"
                  label={{ value: 'Actual (m)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="predicted_value" 
                  name="Predicted" 
                  stroke="#94a3b8"
                  label={{ value: 'Predicted (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  formatter={(value: number, name: string) => [value.toFixed(2) + 'm', name]}
                />
                <Scatter name="Predictions" data={analysisData} fill="#3b82f6" />
                {/* Perfect prediction line */}
                <Line 
                  type="linear" 
                  data={[{actual_value: 0, predicted_value: 0}, {actual_value: 10, predicted_value: 10}]} 
                  dataKey="predicted_value"
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center mt-2">
              Green line: Perfect prediction line
            </p>
          </CardContent>
        </Card>

        {/* Residual Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Residual Distribution</CardTitle>
            <CardDescription className="text-slate-400">
              Error Distribution Analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={residualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="range" 
                  stroke="#94a3b8"
                  label={{ value: 'Residual (m)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                />
                <Bar dataKey="count" fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center mt-2">
              Normal distribution = Good model
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Regression Model Comparison</CardTitle>
          <CardDescription className="text-slate-400">
            Performance comparison of regression models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Station</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">RMSE ↓</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">MAE ↓</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">R² ↑</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">Analyzed At</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.length > 0 ? (
                  analysisData.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 text-slate-100 font-medium">{item.stations?.name}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{item.rmse?.toFixed(3)}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{item.mae?.toFixed(3)}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{item.r2?.toFixed(2)}</td>
                      <td className="text-center py-3 px-4 text-slate-400 text-xs">
                        {new Date(item.analyzed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No analysis data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
