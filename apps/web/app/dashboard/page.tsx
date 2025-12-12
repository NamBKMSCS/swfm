"use client"

import { GuestDashboard } from "@/components/dashboard/guest-dashboard"
import { AuthenticatedDashboard } from "@/components/dashboard/authenticated-dashboard"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"

export default function DashboardPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <MainLayout>
      {role === "guest" ? (
        <GuestDashboard />
      ) : (
        <AuthenticatedDashboard role={role} />
      )}
    </MainLayout>
  )
}
