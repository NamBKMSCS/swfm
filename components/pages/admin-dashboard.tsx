"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { UsersTable } from "@/components/admin/users-table"
import { DataSourcesTable } from "@/components/admin/data-sources-table"
import { SystemHealthPanel } from "@/components/admin/system-health"
import { Users, Database } from "lucide-react"

interface AdminDashboardProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

export function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="admin" role="admin" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Administration Panel" role="admin" />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* System Health */}
            <SystemHealthPanel />

            <div className="grid grid-cols-2 gap-6">
              {/* Users Management */}
              <Card className="col-span-1 bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">User Management</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">12 active users</CardDescription>
                  </div>
                  <Button onClick={() => onNavigate("users")} className="bg-blue-600 hover:bg-blue-700">
                    <Users className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </CardHeader>
                <CardContent>
                  <UsersTable />
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card className="col-span-1 bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Data Management</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">847 records synced</CardDescription>
                  </div>
                  <Button onClick={() => onNavigate("data")} className="bg-blue-600 hover:bg-blue-700">
                    <Database className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </CardHeader>
                <CardContent>
                  <DataSourcesTable />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
