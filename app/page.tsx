"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { GuestDashboard } from "@/components/pages/guest-dashboard"
import { ExpertDashboard } from "@/components/pages/expert-dashboard"
import { TuneParametersPage } from "@/components/pages/tune-parameters"
import { ModelEvaluationPage } from "@/components/pages/model-evaluation"
import { AdminDashboard } from "@/components/pages/admin-dashboard"
import { UserManagementPage } from "@/components/pages/user-management"
import { DataManagementPage } from "@/components/pages/data-management"
import { PreprocessingConfigPage } from "@/components/pages/preprocessing-config"
import { MapDashboard } from "@/components/pages/map-dashboard"
import { RegressionAnalysisPage } from "@/components/pages/regression-analysis"

export default function Home() {
  const { role, isLoading } = useAuth()
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState<
    "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression"
  >("guest")

  useEffect(() => {
    if (!isLoading) {
      if (role === "guest") {
        setCurrentPage("guest")
      } else if (role === "expert") {
        setCurrentPage("expert")
      } else if (role === "admin") {
        setCurrentPage("admin")
      }
    }
  }, [role, isLoading])

  const handleLogout = async () => {
    // This should be handled by AuthProvider or a separate component, 
    // but for now we can just redirect or let the sidebar handle it via a prop if we passed signOut.
    // However, Sidebar calls onLogout.
    // Let's use the signOut from useAuth
  }
  
  // We need to access signOut from useAuth inside the component
  const { signOut } = useAuth()

  const handleNavigate = (
    page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression",
  ) => {
    setCurrentPage(page)
  }

  const handleLoginNavigation = () => {
    router.push("/auth/login")
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Guest Dashboard is always accessible, or at least when role is guest */}
      {/* If role is guest, we show GuestDashboard. If role is expert/admin, we show their dashboards but they can also navigate to guest view? 
          The original code allowed navigation. Let's keep it simple.
      */}
      
      {currentPage === "guest" && (
        <GuestDashboard role={role} onNavigate={handleNavigate} onLogout={signOut} onLogin={handleLoginNavigation} />
      )}
      {currentPage === "map" && (
        <MapDashboard role={role} onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "expert" && role !== "guest" && (
        <ExpertDashboard role={role} onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "tune" && role !== "guest" && (
        <TuneParametersPage role={role} onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "evaluation" && role !== "guest" && (
        <ModelEvaluationPage role={role} onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "regression" && role !== "guest" && (
        <RegressionAnalysisPage role={role} onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "admin" && role === "admin" && (
        <AdminDashboard onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "users" && role === "admin" && (
        <UserManagementPage onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "data" && role === "admin" && (
        <DataManagementPage onNavigate={handleNavigate} onLogout={signOut} />
      )}
      {currentPage === "preprocessing" && role === "admin" && (
        <PreprocessingConfigPage onNavigate={handleNavigate} onLogout={signOut} />
      )}
    </div>
  )
}
