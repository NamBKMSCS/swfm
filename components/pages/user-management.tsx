"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react"

interface UserManagementPageProps {
  onNavigate: (page: "guest" | "expert" | "tune" | "evaluation" | "admin" | "users" | "data" | "preprocessing" | "map") => void
  onLogout: () => void
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: "guest" | "expert" | "admin"
  status: "active" | "inactive"
  createdAt: string
}

export function UserManagementPage({ onNavigate, onLogout }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+66-8-1234-5678",
      role: "admin",
      status: "active",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+66-8-8765-4321",
      role: "expert",
      status: "active",
      createdAt: "2024-02-20",
    },
    {
      id: "3",
      name: "David Chen",
      email: "david.chen@example.com",
      phone: "+66-8-5555-5555",
      role: "expert",
      status: "active",
      createdAt: "2024-03-10",
    },
    {
      id: "4",
      name: "Emma Wilson",
      email: "emma.w@example.com",
      phone: "+66-8-3333-3333",
      role: "guest",
      status: "inactive",
      createdAt: "2024-03-05",
    },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "guest" as const,
  })

  const handleAddUser = () => {
    if (formData.name && formData.email && formData.phone && formData.password) {
      const newUser: User = {
        id: String(users.length + 1),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      }
      setUsers([...users, newUser])
      setFormData({ name: "", email: "", phone: "", password: "", role: "guest" })
      setShowAddForm(false)
    }
  }

  const handleDeleteUser = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((u) => u.id !== id))
    }
  }

  const handleToggleStatus = (id: string) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u)))
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage="users" role="admin" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Management" role="admin" />

        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Add User Section */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-white">Add New User</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Create a new user account with assigned role
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {showAddForm ? "Cancel" : "Add User"}
                </Button>
              </CardHeader>

              {showAddForm && (
                <CardContent className="space-y-4 border-t border-slate-700 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Phone</label>
                      <input
                        type="tel"
                        placeholder="+66-8-1234-5678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="guest">Guest</option>
                        <option value="expert">Expert</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-300">Password</label>
                      <div className="relative mt-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddUser} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Create User
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Users Table */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Users ({users.length})</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Manage system users and access permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 font-medium text-slate-300">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-300">Phone</th>
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
                          <td className="py-3 px-4 text-slate-300">{user.phone}</td>
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
                            <button
                              onClick={() => handleToggleStatus(user.id)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                user.status === "active"
                                  ? "bg-green-900/30 text-green-300"
                                  : "bg-orange-900/30 text-orange-300"
                              }`}
                            >
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{user.createdAt}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
