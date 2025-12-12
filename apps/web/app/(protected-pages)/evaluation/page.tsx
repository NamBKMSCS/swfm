"use client"

import { ModelEvaluationPage } from "@/components/features/data-scientist/model-evaluation"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function EvaluationPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (role === "guest") {
    redirect("/dashboard")
  }

  return <ModelEvaluationPage />
}
