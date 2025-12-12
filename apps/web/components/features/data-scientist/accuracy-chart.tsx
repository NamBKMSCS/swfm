"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getAccuracyByStation } from "@/app/actions/chart-actions"

export function AccuracyChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const accuracyData = await getAccuracyByStation()
        setData(accuracyData)
      } catch (error) {
        console.error('Error fetching accuracy data:', error)
        // Fallback to empty data
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-slate-400">
        No accuracy data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ bottom: 80, left: 10, right: 10, top: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="station"
          stroke="#94a3b8"
          angle={-45}
          textAnchor="end"
          height={100}
          interval={0}
        />
        <YAxis
          stroke="#94a3b8"
          domain={[0, 100]}
          label={{ value: 'Accuracy (R²) %', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
        />
        <Bar dataKey="accuracy" fill="#3b82f6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
