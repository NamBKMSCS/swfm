"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { getErrorDistribution } from "@/app/actions/chart-actions"

export function ErrorDistribution() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const errorData = await getErrorDistribution(10)
        setData(errorData)
      } catch (error) {
        console.error('Error fetching error distribution:', error)
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
        No error distribution data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="day" stroke="#94a3b8" label={{ value: "Evaluation #", position: "right", offset: -5 }} />
        <YAxis stroke="#94a3b8" label={{ value: "RMSE", angle: -90, position: "insideLeft" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
        <Line type="monotone" dataKey="error" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899" }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
