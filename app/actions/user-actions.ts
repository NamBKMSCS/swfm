"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: "guest" | "expert" | "admin"
  status: "active" | "pending" | "rejected"
  createdAt: string
}

export async function getUsers(): Promise<User[]> {
  const supabase = await createClient()
  
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
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return data.map((u: any) => ({
    id: u.id,
    name: u.full_name || 'N/A',
    email: u.email || 'N/A',
    phone: 'N/A',
    role: u.user_roles?.[0]?.role === 'data_scientist' ? 'expert' : u.user_roles?.[0]?.role || 'guest',
    status: u.status || 'pending',
    createdAt: u.created_at ? u.created_at.split('T')[0] : 'N/A'
  }))
}

export async function updateUserStatus(userId: string, status: 'active' | 'rejected' | 'pending') {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  return { success: true }
}
