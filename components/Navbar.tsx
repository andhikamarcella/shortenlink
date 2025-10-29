'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function Navbar() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    const { error } = await supabaseBrowser.auth.signOut()
    if (error) {
      console.error('[navbar] sign out failed:', error.message)
      setSigningOut(false)
      return
    }
    router.push('/auth')
  }

  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 text-sm text-white">
        <Link href="/" className="text-lg font-semibold text-white">
          shortly
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/explore"
            className="rounded px-3 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded px-3 py-2 text-neutral-200 transition hover:bg-white/10"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded bg-white px-3 py-2 font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>
    </header>
  )
}
