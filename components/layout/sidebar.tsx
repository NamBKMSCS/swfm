"use client"

import { Button } from "@/components/ui/button"
import { LayoutDashboard, BarChart3, Settings, LogOut, Zap, Users, Database, Sliders, Map, TrendingUp } from "lucide-react"

interface SidebarProps {
  currentPage: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression"
  role: "guest" | "expert" | "admin"
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression") => void
  onLogout: () => void
  onLogin?: () => void
}

export function Sidebar({ currentPage, role, onNavigate, onLogout, onLogin }: SidebarProps) {
  const menuItems = [
    { id: "guest", label: "Dashboard", icon: LayoutDashboard, roles: ["guest", "expert", "admin"] },
    { id: "map", label: "Map", icon: Map, roles: ["guest", "expert", "admin"] },
    { id: "expert", label: "Advanced Modeling", icon: Zap, roles: ["expert", "admin"] },
    { id: "regression", label: "Regression Analysis", icon: TrendingUp, roles: ["expert", "admin"] },
    { id: "tune", label: "Tune Parameters", icon: Settings, roles: ["expert", "admin"] },
    { id: "evaluation", label: "Model Evaluation", icon: BarChart3, roles: ["expert", "admin"] },
    { id: "admin", label: "Administration", icon: Settings, roles: ["admin"] },
    { id: "users", label: "User Management", icon: Users, roles: ["admin"] },
    { id: "data", label: "Data Management", icon: Database, roles: ["admin"] },
    { id: "preprocessing", label: "Data Preprocessing", icon: Sliders, roles: ["admin"] },
  ]

  const filteredItems = menuItems.filter((item) => {
    if (item.roles.includes(role)) {
      // Skip "Tune Parameters" if already showing "Administration"
      if (role === "admin" && item.id === "tune") return false
      return true
    }
    return false
  })

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">SWFM</h2>
        <p className="text-xs text-slate-400 mt-1">Water Forecasting</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Info */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs font-semibold text-slate-300">Role</p>
          <p className="text-sm text-blue-400 font-medium capitalize">{role}</p>
        </div>
        {role === "guest" ? (
          <Button
            onClick={onLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2 rotate-180" />
            Login
          </Button>
        ) : (
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </div>
  )
}
