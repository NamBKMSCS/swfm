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
import { useState, useEffect } from 'react'
import { toast } from "sonner"

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [role, setRole] = useState<"data_scientist" | "admin">("data_scientist")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFirstUser, setIsFirstUser] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkFirstUser = async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (count === 0) {
        setIsFirstUser(true)
        setRole('admin')
      }
    }
    checkFirstUser()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      console.log("Starting sign up with:", { email, role })
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`,
          data: {
            role: role,
          },
        },
      })
      console.log("Sign up result:", { data, error })

      if (error) throw error

      toast.success("Sign up successful! Redirecting...")
      console.log("Redirecting to success page...")
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      console.error("Sign up error:", error)
      const msg = error instanceof Error ? error.message : 'An error occurred'
      setError(msg)
      toast.error(msg)
    } finally {
      console.log("Sign up finished, resetting loading state")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
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
              <Field suppressHydrationWarning>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field suppressHydrationWarning>
                <FieldLabel htmlFor="repeat-password">Repeat Password</FieldLabel>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </Field>

              {!isFirstUser && (
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as "data_scientist" | "admin")}
                    className="grid grid-cols-2 gap-4"
                  >
                    <FieldLabel htmlFor="role-expert" className="cursor-pointer">
                      <Field className="border rounded-lg p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                        <RadioGroupItem value="data_scientist" id="role-expert" className="sr-only" />
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
              )}
              {isFirstUser && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                  You will be registered as the first admin user.
                </div>
              )}
              <FieldError>{error}</FieldError>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating an account...' : 'Sign up'}
              </Button>
            </FieldGroup>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
