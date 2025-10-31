'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser'

export default function Navbar() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      setLoadingSession(true)
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session ?? null)
      setLoadingSession(false)
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
    })

    void loadSession()

    return () => {
      isMounted = false
      subscription?.subscription.unsubscribe()
    }
  }, [supabase])

  const isLoggedIn = !!session

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[navbar] failed to sign out:', error.message)
      setSigningOut(false)
      return
    }

    router.push('/auth')
    setSigningOut(false)
  }

  return (
    <header className="border-b border-white/10 bg-[#0d1326]/80 text-white backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-white">
            shortly
          </Link>
          {isLoggedIn && (
            <nav className="hidden items-center gap-4 text-sm text-white/80 md:flex">
              <Link href="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <Link href="/explore" className="transition hover:text-white">
                Analytics
              </Link>
              <Link href="/feedback" className="transition hover:text-white">
                Feedback
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-white/60">
          <span className="hidden select-none sm:inline-block">Version 1.0 alpha</span>
          {isLoggedIn && !loadingSession && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
