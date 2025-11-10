"use client"

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StationChartProps {
  stationId: number
  stationName: string
}

// Mock data for chart
const generateMockData = (days: number) => {
  const data = []
  const currentDate = new Date()
  
  // Historical actual data
  for (let i = days; i >= 1; i--) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - i)
    
    data.push({
      time: date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      actual: Math.round((2 + Math.sin(i * 0.5) * 0.5 + Math.random() * 0.3) * 100) / 100,
      forecast: null, // No forecast for past data
      isToday: false
    })
  }
  
  // Today (both actual and forecast)
  data.push({
    time: 'Today',
    actual: Math.round((2.1 + Math.random() * 0.2) * 100) / 100,
    forecast: Math.round((2.2 + Math.random() * 0.3) * 100) / 100,
    isToday: true
  })
  
  // Forecast data (future)
  for (let i = 1; i <= Math.min(days, 3); i++) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + i)
    
    data.push({
      time: date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      actual: null, // No actual data for future
      forecast: Math.round((2.3 + Math.sin(i * 0.3) * 0.4 + Math.random() * 0.2) * 100) / 100,
      isToday: false
    })
  }
  
  return data
}

export function StationChart({ stationId, stationName }: StationChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<1 | 5 | 7>(7)
  const chartData = generateMockData(selectedPeriod)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'actual' ? 'Actual' : 'Forecast'}: {entry.value}m
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">{stationName}</CardTitle>
        <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
          <Button
            variant={selectedPeriod === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(1)}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            1 day
          </Button>
          <Button
            variant={selectedPeriod === 5 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(5)}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            5 days
          </Button>
          <Button
            variant={selectedPeriod === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(7)}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            7 days
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={10}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={10}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                label={{ 
                  value: 'Water Level (m)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: '10px' } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                connectNulls={false}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quick Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Current</p>
            <p className="text-sm sm:text-lg font-bold text-green-400">
              {chartData.find(d => d.isToday)?.actual}m
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Today's Forecast</p>
            <p className="text-sm sm:text-lg font-bold text-blue-400">
              {chartData.find(d => d.isToday)?.forecast}m
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Trend</p>
            <p className="text-sm sm:text-lg font-bold text-yellow-400">
              {Math.random() > 0.5 ? '↗ Rising' : '↘ Falling'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}