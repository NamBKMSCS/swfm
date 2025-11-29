"use client"

import { ModelEvaluationPage } from "@/components/pages/model-evaluation"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function AdminEvaluationPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <MainLayout>
      <ModelEvaluationPage role="admin" />
    </MainLayout>
  )
}
