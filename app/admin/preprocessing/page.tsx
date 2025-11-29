"use client"

import { PreprocessingConfigPage } from "@/components/pages/preprocessing-config"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function PreprocessingPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <MainLayout>
      <PreprocessingConfigPage />
    </MainLayout>
  )
}
