"use client"

import { UserManagementPage } from "@/components/features/admin/user-management"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/providers/auth-provider"
import { redirect } from "next/navigation"

export default function UsersPage() {
  const { role, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>

  if (role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <MainLayout>
      <UserManagementPage />
    </MainLayout>
  )
}
