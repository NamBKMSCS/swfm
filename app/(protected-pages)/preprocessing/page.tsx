"use client"

import { PreprocessingConfigPage } from "@/components/features/data-scientist/preprocessing-config"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function PreprocessingPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
      <PreprocessingConfigPage />
  )
}
