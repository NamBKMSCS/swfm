"use client"

import { AuthenticatedDashboard } from "@/components/dashboard/authenticated-dashboard"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function ExpertPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading...</div>
  }

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
      <AuthenticatedDashboard role="expert" />
  )
}
