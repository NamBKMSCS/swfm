"use client"

import { ForecastingPage } from "@/components/features/data-scientist/forecasting-page"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ForecastPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  // Admin and data_scientist can access
  if (role === "guest") {
    redirect("/dashboard")
  }

  return <ForecastingPage />
}
