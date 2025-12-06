"use client"

import { ModelEvaluationPage } from "@/components/features/data-scientist/model-evaluation"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function EvaluationPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
      <ModelEvaluationPage role={role as "expert" | "admin"} />
  )
}
