"use client"

import { ModelEvaluationPage } from "@/components/pages/model-evaluation"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function EvaluationPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
    <MainLayout>
      <ModelEvaluationPage role={role as "expert" | "admin"} />
    </MainLayout>
  )
}
