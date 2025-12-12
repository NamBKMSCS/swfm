"use client"

import { DataManagementPage } from "@/components/features/data-scientist/data-management"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function DataPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (role !== "admin" && role !== "expert") {
    redirect("/dashboard")
  }

  return <DataManagementPage />
}
