"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search, MoreVertical, Edit, Trash2, Shield, UserCheck, UserX,
  Users, Loader2, Mail, Calendar, Clock
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { updateUserStatus, deleteUser, getUsers, UserWithRole } from "@/app/actions/user-actions"

// Helper to display role with proper formatting
function getRoleDisplay(role: string) {
  const roleMap: Record<string, { label: string; color: string; icon?: boolean }> = {
    admin: { label: "Admin", color: "text-blue-400", icon: true },
    data_scientist: { label: "Data Scientist", color: "text-purple-400" },
    expert: { label: "Expert", color: "text-purple-400" },
    guest: { label: "Guest", color: "text-slate-400" },
  }
  return roleMap[role] || { label: role, color: "text-slate-400" }
}

// Helper to display status with proper styling
function getStatusBadge(status: string) {
  const statusMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-green-500/20", text: "text-green-400" },
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    rejected: { bg: "bg-red-500/20", text: "text-red-400" },
  }
  const style = statusMap[status] || { bg: "bg-slate-500/20", text: "text-slate-400" }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  )
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      toast.error("Failed to fetch users")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const handleStatusChange = async (userId: string, newStatus: "active" | "pending" | "rejected") => {
    try {
      await updateUserStatus(userId, newStatus)
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      toast.success(`User status updated to ${newStatus}`)
    } catch (error) {
      toast.error("Failed to update user status")
    }
  }

  const confirmDelete = (userId: string) => {
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete)
      setUsers(users.filter(u => u.id !== userToDelete))
      toast.success("User deleted successfully")
    } catch (error) {
      toast.error("Failed to delete user")
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // Stats summary
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === "active").length,
    pending: users.filter(u => u.status === "pending").length,
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm mt-1">Manage user accounts and permissions</p>
          </div>

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active Users</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pending Approval</p>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-white text-lg">All Users</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">No users found</h3>
                <p className="text-slate-400 text-sm">
                  {searchTerm ? "Try adjusting your search terms" : "Add your first user to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-medium">User</TableHead>
                      <TableHead className="text-slate-400 font-medium">Role</TableHead>
                      <TableHead className="text-slate-400 font-medium">Status</TableHead>
                      <TableHead className="text-slate-400 font-medium">Joined</TableHead>
                      <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roleDisplay = getRoleDisplay(user.role)
                      return (
                        <TableRow key={user.id} className="border-slate-700/50 hover:bg-slate-700/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                {user.name !== 'N/A' ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {user.name !== 'N/A' ? user.name : 'No name set'}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Mail className="w-3 h-3" />
                                  <span>{user.email || 'No email'}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {roleDisplay.icon && <Shield className="w-4 h-4 text-blue-400" />}
                              <span className={`font-medium ${roleDisplay.color}`}>
                                {roleDisplay.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{user.createdAt !== 'N/A' ? user.createdAt : 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700">
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-slate-300 w-48">
                                <DropdownMenuLabel className="text-slate-400">Actions</DropdownMenuLabel>
                                <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-700" />
                                {user.status === "active" ? (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(user.id, "rejected")}
                                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-yellow-400 focus:text-yellow-400"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(user.id, "active")}
                                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-green-400 focus:text-green-400"
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                {user.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() => handleStatusChange(user.id, "rejected")}
                                    className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer text-red-400 focus:text-red-400"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-slate-700" />
                                <DropdownMenuItem
                                  onClick={() => confirmDelete(user.id)}
                                  className="hover:bg-red-900/50 focus:bg-red-900/50 cursor-pointer text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
