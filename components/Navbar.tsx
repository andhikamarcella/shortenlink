'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function Navbar() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession()
      if (!isMounted) return
      setSession(data.session ?? null)
      setLoadingSession(false)
    }

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_, eventSession) => {
      if (!isMounted) return
      setSession(eventSession)
    })

    void loadSession()

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const isLoggedIn = !!session

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
    setSigningOut(false)
  }

  return (
    <header className="bg-[#0d1326]/80 backdrop-blur-sm border-b border-white/10 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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

        <div className="flex items-center gap-4 text-xs text-white/50">
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
