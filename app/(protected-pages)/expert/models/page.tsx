"use client"

import { ModelRegistry } from "@/components/features/data-scientist/model-registry"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function ModelsPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <ModelRegistry />
    </div>
  )
}
