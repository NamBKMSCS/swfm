"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"

interface UserManagementPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression") => void
  onLogout: () => void
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: "guest" | "expert" | "admin"
  status: "active" | "pending" | "rejected"
  createdAt: string
}

export function UserManagementPage({ onNavigate, onLogout }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      // Join users with user_roles to get roles
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          status,
          created_at,
          user_roles (
            role
          )
        `)
      
      if (error) throw error

      if (data) {
        const formattedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          name: u.full_name || 'N/A',
          email: u.email || 'N/A',
          phone: 'N/A', // Phone not in DB yet
          role: u.user_roles?.[0]?.role === 'data_scientist' ? 'expert' : u.user_roles?.[0]?.role || 'guest',
          status: u.status || 'pending',
          createdAt: u.created_at.split('T')[0]
        }))
        setUsers(formattedUsers)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      // Prevent self-deactivation
      if (currentUser?.id === id) {
        alert("You cannot deactivate your own account.")
        return
      }

      const targetStatus = currentStatus === 'active' ? 'rejected' : 'active'

      const { error } = await supabase
        .from('users')
        .update({ status: targetStatus })
        .eq('id', id)

      if (error) throw error

      fetchUsers()
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      // Deleting user from public.users might not delete from auth.users.
      // Usually we delete from auth.users via server-side admin API.
      // Client-side deletion of other users is restricted.
      // For now, let's just update status to rejected or leave as is since we don't have Admin API setup here.
      alert("Deleting users requires Admin API access. Please reject the user instead.")
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="users" role="admin" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Management" role="admin" />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            
            {/* Users Table */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">User Accounts ({users.length})</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Manage system users and approvals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-white">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Name</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Email</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Role</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Created</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-white font-medium">{user.name}</td>
                            <td className="py-3 px-4 text-slate-300">{user.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-red-900/30 text-red-300"
                                    : user.role === "expert"
                                      ? "bg-blue-900/30 text-blue-300"
                                      : "bg-slate-700/50 text-slate-300"
                                }`}
                              >
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  user.status === "active"
                                    ? "bg-green-900/30 text-green-300"
                                    : user.status === "pending"
                                      ? "bg-yellow-900/30 text-yellow-300"
                                      : "bg-red-900/30 text-red-300"
                                }`}
                              >
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">{user.createdAt}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {user.status === 'pending' && (
                                    <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                    >
                                    Approve
                                    </button>
                                )}
                                {user.status === 'active' && (
                                    <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    disabled={currentUser?.id === user.id}
                                    className={`px-2 py-1 rounded text-xs text-white ${
                                      currentUser?.id === user.id 
                                        ? "bg-slate-600 cursor-not-allowed opacity-50" 
                                        : "bg-red-600 hover:bg-red-700"
                                    }`}
                                    >
                                    Deactivate
                                    </button>
                                )}
                                {user.status === 'rejected' && (
                                    <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                                    >
                                    Re-activate
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
