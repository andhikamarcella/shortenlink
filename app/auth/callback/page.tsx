'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  useEffect(() => {
    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!error && data?.session) {
        router.replace('/dashboard')
        return
      }

      router.replace('/auth')
    }

    void syncSession()
  }, [router, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p>Signing you in...</p>
    </main>
  )
}

//
// Notes:
// - The Supabase auth helper persists the session via cookies. We simply read it
//   and redirect once it becomes available. If the session is missing we return
//   users to the auth screen so they can retry the flow.
//
