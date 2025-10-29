'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function DashboardPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabaseBrowser.auth.getSession()

      // no session? kick back to /auth
      if (error || !data?.session) {
        router.replace('/auth')
        return
      }

      // we have a session
      setChecking(false)
    }

    void run()
  }, [router])

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading dashboard...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-neutral-300 text-sm">
        You are signed in.
      </p>
      {/* ...rest of the dashboard UI... */}
    </main>
  )
}

//
// Notes:
// - Dashboard does a session check on mount.
// - If there's no session, redirect to /auth.
// - This ensures unauthenticated users can't just hit /dashboard directly.
//
