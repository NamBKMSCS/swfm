"use client"

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { getStationChartData } from '@/app/actions/chart-actions'

interface StationChartProps {
  stationId: number
  stationName: string
}

const chartConfig = {
  actual: {
    label: "Actual",
    color: "#10B981",
  },
  forecast: {
    label: "Forecast",
    color: "#3B82F6",
  },
} satisfies ChartConfig

// Period options in days
type PeriodOption = 1 | 7 | 14 | 30 | 90 | 180

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
]

export function StationChart({ stationId, stationName }: StationChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(7)
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const { measurements, forecasts } = await getStationChartData(stationId, selectedPeriod)

        // Combine measurements and forecasts into chart format
        const data: any[] = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Add historical measurements with proper time formatting
        measurements.forEach((m: any) => {
          // Skip if no measured_at date
          if (!m.measured_at) return

          const measuredDate = new Date(m.measured_at)

          // Skip invalid dates
          if (isNaN(measuredDate.getTime())) return

          // Format based on period
          let timeLabel: string
          if (selectedPeriod === 1) {
            // Show hour:minute for 1-day view
            timeLabel = measuredDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          } else if (selectedPeriod <= 14) {
            // Show day/month for up to 14 days
            timeLabel = measuredDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
          } else if (selectedPeriod <= 30) {
            // Show day month for 30 days
            timeLabel = measuredDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          } else {
            // Show month/year for 3-6 months
            timeLabel = measuredDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          }

          data.push({
            time: timeLabel,
            timestamp: measuredDate.getTime(),
            actual: m.water_level != null ? Math.round(m.water_level * 100) / 100 : null,
            forecast: null,
            isToday: measuredDate.toDateString() === today.toDateString()
          })
        })

        // Add forecasts
        forecasts.forEach((f: any) => {
          // Skip if no target_date
          if (!f.target_date) return

          const forecastDate = new Date(f.target_date)

          // Skip invalid dates
          if (isNaN(forecastDate.getTime())) return

          const timeLabel = forecastDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })

          data.push({
            time: timeLabel,
            timestamp: forecastDate.getTime(),
            actual: null,
            forecast: f.water_level != null ? Math.round(f.water_level * 100) / 100 : null,
            isToday: false
          })
        })

        // Sort by timestamp to ensure proper ordering
        data.sort((a, b) => a.timestamp - b.timestamp)

        // When using numeric X-axis, keep all data points (no dedup by time label)
        setChartData(data)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [stationId, selectedPeriod])

  // Calculate statistics
  const currentLevel = chartData.length > 0
    ? chartData.filter(d => d.actual !== null).pop()?.actual
    : null

  const latestForecast = chartData.length > 0
    ? chartData.filter(d => d.forecast !== null)[0]?.forecast
    : null

  const trend = chartData.length >= 2
    ? (() => {
      const actuals = chartData.filter(d => d.actual !== null)
      if (actuals.length >= 2) {
        const last = actuals[actuals.length - 1].actual
        const prev = actuals[actuals.length - 2].actual
        return last > prev ? '↗ Rising' : last < prev ? '↘ Falling' : '→ Stable'
      }
      return '→ Stable'
    })()
    : '→ Stable'

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">{stationName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 w-full flex items-center justify-center">
            <div className="animate-pulse text-slate-400">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">{stationName}</CardTitle>
        <div className="flex items-center gap-2">
          {/* Quick buttons for common periods */}
          <div className="hidden sm:flex gap-1">
            <Button
              variant={selectedPeriod === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(1)}
              className="text-xs"
            >
              1D
            </Button>
            <Button
              variant={selectedPeriod === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(7)}
              className="text-xs"
            >
              7D
            </Button>
            <Button
              variant={selectedPeriod === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(30)}
              className="text-xs"
            >
              1M
            </Button>
            <Button
              variant={selectedPeriod === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(90)}
              className="text-xs"
            >
              3M
            </Button>
          </div>
          {/* Dropdown for all options */}
          <Select
            value={selectedPeriod.toString()}
            onValueChange={(value) => setSelectedPeriod(Number(value) as PeriodOption)}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <LineChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={30}
              tickFormatter={(value) => {
                if (!value || isNaN(value)) return ''
                const date = new Date(value)
                if (isNaN(date.getTime())) return ''
                if (selectedPeriod === 1) {
                  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                } else if (selectedPeriod <= 7) {
                  return date.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit' })
                } else if (selectedPeriod <= 30) {
                  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                }
                return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={['auto', 'auto']}
              tickFormatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}m` : value}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => {
                    // Access actual timestamp from payload data
                    const timestamp = payload?.[0]?.payload?.timestamp
                    if (!timestamp || isNaN(Number(timestamp))) return 'Unknown'
                    const date = new Date(timestamp)
                    if (isNaN(date.getTime())) return 'Unknown'
                    return date.toLocaleString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }}
                  formatter={(value, name) => (
                    <span className="font-medium">{value}m</span>
                  )}
                />
              }
            />
            {/* <ChartLegend content={<ChartLegendContent />} /> */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-actual)"
              strokeWidth={2}
              dot={{ fill: "var(--color-actual)", strokeWidth: 2, r: 3 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "var(--color-forecast)", strokeWidth: 2, r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>

        {/* Quick Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Current</p>
            <p className="text-sm sm:text-lg font-bold text-green-400">
              {currentLevel !== null ? `${currentLevel}m` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Next Forecast</p>
            <p className="text-sm sm:text-lg font-bold text-blue-400">
              {latestForecast !== null ? `${latestForecast}m` : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-slate-400">Trend</p>
            <p className="text-sm sm:text-lg font-bold text-yellow-400">
              {trend}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}