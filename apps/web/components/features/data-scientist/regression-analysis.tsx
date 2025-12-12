"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from "recharts"
import { getRegressionAnalysis } from "@/app/actions/analysis-actions"
import { getFeatureImportance } from "@/app/actions/ml-actions"

interface RegressionAnalysisProps {
  role: "expert" | "admin"
}

export function RegressionAnalysisPage({ role }: RegressionAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<any[]>([])
  const [featureImportanceData, setFeatureImportanceData] = useState<any[]>([])
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRegressionAnalysis()
      setAnalysisData(data || [])
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchFeatures = async () => {
      setIsLoadingFeatures(true)
      const features = await getFeatureImportance()
      setFeatureImportanceData(features)
      setIsLoadingFeatures(false)
    }
    fetchFeatures()
  }, [])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-2">Regression Analysis - Feature Importance</h3>
        <p className="text-slate-400 text-sm">
          Analyze the impact level of features on water level forecast results.
          Features are ranked by their importance in predicting water levels across all monitoring stations.
        </p>
      </div>

      {/* Feature Importance - Full Width and Larger */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Feature Importance (Impact Level Analysis)</CardTitle>
          <CardDescription className="text-slate-400">
            Most important features used in water level forecasting models
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFeatures ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="animate-pulse text-slate-400">Loading feature importance...</div>
            </div>
          ) : featureImportanceData.length === 0 ? (
            <div className="flex items-center justify-center h-[600px] text-slate-400">
              No feature importance data available. Train models to see feature analysis.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={700}>
                <BarChart data={featureImportanceData.slice(0, 20)} layout="vertical" margin={{ left: 200, right: 40, top: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    label={{ value: 'Importance Score', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={190}
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                    formatter={(value: number) => [`${value.toFixed(4)}`, 'Importance']}
                  />
                  <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 grid grid-cols-4 gap-4">
                {featureImportanceData.slice(0, 4).map((item, index) => (
                  <div key={item.name} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">#{index + 1}</span>
                      <span className="text-xs font-semibold text-blue-400">
                        {(item.importance * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium mb-1">{item.name}</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {item.importance.toFixed(4)}
                    </p>
                    <span className="text-xs text-slate-500">Importance Score</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
