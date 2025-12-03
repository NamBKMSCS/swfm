'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldDescription,
} from '@/components/ui/field'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<"expert" | "admin">("expert")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError

      if (!user) throw new Error("Login failed")

      // Check user status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('status')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      if (userData.status === 'pending') {
        await supabase.auth.signOut()
        throw new Error("Account is pending approval. Please contact an administrator.")
      }

      if (userData.status === 'rejected') {
        await supabase.auth.signOut()
        throw new Error("Account has been rejected.")
      }

      // Check user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleError) throw roleError

      // Validate selected role against actual role
      // UI "expert" maps to DB "data_scientist"
      const dbRole = roleData.role
      const expectedDbRole = selectedRole === "expert" ? "data_scientist" : "admin"

      if (dbRole !== expectedDbRole) {
        await supabase.auth.signOut()
        throw new Error(`Invalid role selected. You are not an ${selectedRole}.`)
      }

      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push('/')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>Login as</FieldLabel>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as "expert" | "admin")}
                  className="grid grid-cols-2 gap-4"
                >
                  <FieldLabel htmlFor="role-expert" className="cursor-pointer">
                    <Field className="border rounded-lg p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                      <RadioGroupItem value="expert" id="role-expert" className="sr-only" />
                      <div className="text-sm font-medium">Expert</div>
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="role-admin" className="cursor-pointer">
                    <Field className="border rounded-lg p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                      <RadioGroupItem value="admin" id="role-admin" className="sr-only" />
                      <div className="text-sm font-medium">Admin</div>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </Field>

              <FieldError>{error}</FieldError>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </FieldGroup>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
