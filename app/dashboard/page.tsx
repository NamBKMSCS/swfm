"use client"

import { GuestDashboard } from "@/components/pages/guest-dashboard"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"

export default function DashboardPage() {
  const { role } = useAuth()
  return (
    <MainLayout>
      <GuestDashboard role={role} />
    </MainLayout>
  )
}
