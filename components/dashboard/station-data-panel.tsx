"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp } from "lucide-react"

interface StationDataPanelProps {
  station: string
  role: "guest" | "expert" | "admin"
}

export function StationDataPanel({ station, role }: StationDataPanelProps) {
  return (
    <div className="space-y-4">
      {/* Current Data */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">{station}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-700 rounded p-3">
            <p className="text-slate-400 text-xs">Current Level</p>
            <p className="text-2xl font-bold text-white mt-1">3.52 m</p>
            <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+0.15 m today</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700 rounded p-2">
              <p className="text-slate-400 text-xs">Rainfall</p>
              <p className="text-lg font-semibold text-white mt-1">45 mm</p>
            </div>
            <div className="bg-slate-700 rounded p-2">
              <p className="text-slate-400 text-xs">Temperature</p>
              <p className="text-lg font-semibold text-white mt-1">28°C</p>
            </div>
          </div>

          <div className="bg-slate-700 rounded p-2">
            <p className="text-slate-400 text-xs">10-Day Average</p>
            <p className="text-lg font-semibold text-white mt-1">3.18 m</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
