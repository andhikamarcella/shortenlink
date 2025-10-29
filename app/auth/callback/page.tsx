'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = supabaseClient

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth?error=NoSession')
      }
    }

    void run()
  }, [router, supabase])

  return (
    <main className="flex min-h-screen items-center justify-center text-white">
      <p>Signing you in…</p>
    </main>
  )
}
