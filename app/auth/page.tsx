'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const supabase = supabaseBrowser

  const handleLogin = async () => {
    setLoading(true)

    const redirectBase = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectBase}/auth/callback`,
      },
    })

    if (error) {
      console.error('OAuth error:', error.message)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-md bg-neutral-900 p-6 text-white shadow">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-neutral-400">Use Google to access your dashboard.</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded bg-white px-4 py-2 font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
      </div>
    </main>
  )
}
