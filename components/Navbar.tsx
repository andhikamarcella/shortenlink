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
    <header className="border-b border-white/10 bg-[#0b1021]">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4 text-sm text-white/80">
        <Link href="/" className="text-lg font-semibold text-white">
          shortly
        </Link>

        <div className="ml-auto flex items-center gap-5">
          <Link
            href="/explore"
            className="rounded-md px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>
    </header>
  )
}
