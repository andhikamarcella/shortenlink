'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)

    // IMPORTANT:
    // NEXT_PUBLIC_BASE_URL should be exactly "https://shortenlink-snowy.vercel.app"
    // (NO trailing slash) in Vercel environment variables.
    // The final redirectTo must match the Supabase provider config AND
    // the Google OAuth "Authorized redirect URIs".
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('[auth] OAuth error:', error.message)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1326] text-white">
      <div className="rounded-lg bg-black/60 p-6 text-center shadow">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Use Google to access your dashboard.
        </p>
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
