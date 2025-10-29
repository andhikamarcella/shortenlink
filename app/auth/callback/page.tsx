'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data } = await supabaseBrowser.auth.getSession()
      if (data.session) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth?error=no-session')
      }
    }
    void run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p>Signing you in...</p>
    </main>
  )
}
