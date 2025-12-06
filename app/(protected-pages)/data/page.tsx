"use client"

import { DataManagementPage } from "@/components/features/data-scientist/data-management"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function DataPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role !== "admin" && role !== "expert") {
    redirect("/dashboard")
  }

  return (
      <DataManagementPage />
  )
}
