'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard')
    }, 2000)

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!error && data?.session) {
        clearTimeout(timer)
        router.replace('/dashboard')
        return
      }
    }

    void syncSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timer)
        router.replace('/dashboard')
      }
    })

    return () => {
      clearTimeout(timer)
      authListener?.subscription.unsubscribe()
    }
  }, [router, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p>Signing you in...</p>
    </main>
  )
}

