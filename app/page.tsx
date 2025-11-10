"use client"

import { useState } from "react"
import { LoginPage } from "@/components/pages/login-page"
import { GuestDashboard } from "@/components/pages/guest-dashboard"
import { ExpertDashboard } from "@/components/pages/expert-dashboard"
import { TuneParametersPage } from "@/components/pages/tune-parameters"
import { ModelEvaluationPage } from "@/components/pages/model-evaluation"
import { AdminDashboard } from "@/components/pages/admin-dashboard"
import { UserManagementPage } from "@/components/pages/user-management"
import { DataManagementPage } from "@/components/pages/data-management"
import { PreprocessingConfigPage } from "@/components/pages/preprocessing-config"
import { MapDashboard } from "@/components/pages/map-dashboard"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<
    "login" | "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map"
  >("login")
  const [userRole, setUserRole] = useState<"guest" | "expert" | "admin">("guest")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = (role: "guest" | "expert" | "admin") => {
    setUserRole(role)
    setIsAuthenticated(true)
    setCurrentPage(role === "guest" ? "guest" : role === "expert" ? "expert" : "admin")
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentPage("login")
  }

  const handleNavigate = (
    page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map",
  ) => {
    setCurrentPage(page)
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      {currentPage === "guest" && (
        <GuestDashboard role={userRole} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "map" && (
        <MapDashboard role={userRole} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "expert" && userRole !== "guest" && (
        <ExpertDashboard role={userRole} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "tune" && userRole !== "guest" && (
        <TuneParametersPage role={userRole} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "evaluation" && userRole !== "guest" && (
        <ModelEvaluationPage role={userRole} onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "admin" && userRole === "admin" && (
        <AdminDashboard onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "users" && userRole === "admin" && (
        <UserManagementPage onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "data" && userRole === "admin" && (
        <DataManagementPage onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === "preprocessing" && userRole === "admin" && (
        <PreprocessingConfigPage onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
    </div>
  )
}
