import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16 text-center md:py-32">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          SWFM
          <span className="block text-blue-500">Water Forecasting</span>
        </h1>
        <p className="max-w-[42rem] leading-normal text-slate-400 sm:text-xl sm:leading-8">
          Advanced water level monitoring and forecasting system for the Mekong River.
        </p>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Guest Access
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
