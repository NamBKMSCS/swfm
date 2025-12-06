"use client"

import { ForecastingPage } from "@/components/features/data-scientist/forecasting-page"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function ForecastPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <ForecastingPage />
    </div>
  )
}
