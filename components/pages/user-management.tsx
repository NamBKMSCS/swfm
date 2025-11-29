"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth-provider"
import { getUsers, updateUserStatus, User } from "@/app/actions/user-actions"
import { toast } from "sonner"

interface UserManagementPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map" | "regression") => void
  onLogout: () => void
}

export function UserManagementPage({ onNavigate, onLogout }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    // Prevent self-deactivation
    if (currentUser?.id === id) {
      toast.error("You cannot deactivate your own account.")
      return
    }

    const targetStatus = currentStatus === 'active' ? 'rejected' : 'active'

    startTransition(async () => {
      try {
        await updateUserStatus(id, targetStatus)
        toast.success(`User status updated to ${targetStatus}`)
        // Optimistic update or refetch
        fetchUsers() 
      } catch (error) {
        console.error("Error updating status:", error)
        toast.error("Failed to update user status")
      }
    })
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
                                    disabled={isPending}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs disabled:opacity-50"
                                    >
                                    Approve
                                    </button>
                                )}
                                {user.status === 'active' && (
                                    <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    disabled={currentUser?.id === user.id || isPending}
                                    className={`px-2 py-1 rounded text-xs text-white ${
                                      currentUser?.id === user.id 
                                        ? "bg-slate-600 cursor-not-allowed opacity-50" 
                                        : "bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                    }`}
                                    >
                                    Deactivate
                                    </button>
                                )}
                                {user.status === 'rejected' && (
                                    <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    disabled={isPending}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs disabled:opacity-50"
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

