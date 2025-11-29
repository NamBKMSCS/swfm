"use client"

import { TuneParametersPage } from "@/components/pages/tune-parameters"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function TunePage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role === "guest") {
    redirect("/dashboard")
  }

  return (
    <MainLayout>
      <TuneParametersPage role={role as "expert" | "admin"} />
    </MainLayout>
  )
}
