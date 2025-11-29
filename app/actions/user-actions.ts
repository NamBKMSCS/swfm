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
  lastLogin?: string
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
    createdAt: u.created_at ? u.created_at.split('T')[0] : 'N/A',
    lastLogin: 'N/A' // Mocking this for now as it's not in the query
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

export async function deleteUser(userId: string) {
  const supabase = await createClient()
  
  // Note: This is a soft delete or hard delete depending on requirements.
  // For now, we'll assume hard delete from the users table, but usually auth.users needs deletion too.
  // Since we can't easily delete from auth.users via client SDK without service role, 
  // we might just delete from the public profile table or mark as deleted.
  // For this implementation, we will try to delete from the public table.
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  return { success: true }
}
