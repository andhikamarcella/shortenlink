'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!error && data?.session) {
        router.replace('/dashboard')
        return
      }

      router.replace('/auth')
    }

    void run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p>Signing you in...</p>
    </main>
  )
}
