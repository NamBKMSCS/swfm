"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { AppRole } from "@/lib/supabase/schema"

type UIRole = "guest" | "expert" | "admin"
type UserStatus = "pending" | "active" | "rejected"

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UIRole
  status: UserStatus | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UIRole>("guest")
  const [status, setStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          await fetchUserRoleAndStatus(session.user.id)
        } else {
          setRole("guest")
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchUserRoleAndStatus(session.user.id)
          } else {
            setRole("guest")
            setStatus(null)
          }
          setIsLoading(false)
        }
      )

      return () => subscription.unsubscribe()
    }

    initializeAuth()
  }, [])

  const fetchUserRoleAndStatus = async (userId: string) => {
    try {
      // Fetch Role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single()

      if (roleError) {
        if (roleError.code === 'PGRST116') {
          console.log("No role found for user, defaulting to guest.")
          setRole("guest")
        } else {
          console.error("Error fetching user role:", roleError)
        }
      } else if (roleData) {
        if (roleData.role === AppRole.admin) {
          setRole("admin")
        } else if (roleData.role === AppRole.data_scientist) {
          setRole("expert")
        } else {
          setRole("guest")
        }
      }

      // Fetch Status
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("status")
        .eq("id", userId)
        .single()

      if (userError) {
        if (userError.code === 'PGRST116') {
           console.warn("User record not found in public.users. Defaulting status to pending.")
           setStatus('pending')
        } else {
           console.error("Error fetching user status:", userError.message, userError.details, userError.hint)
           // If the column doesn't exist (migration missing), we might want to default to active for dev?
           // But strictly we should probably be pending.
           // Let's set to null or pending.
        }
      } else if (userData) {
        // We need to cast here because the types might not be fully generated yet or mismatch slightly
        setStatus(userData.status as UserStatus)
      }

    } catch (error) {
      console.error("Error in fetchUserRoleAndStatus:", error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setRole("guest")
    setStatus(null)
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, role, status, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
