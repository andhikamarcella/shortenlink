'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser'
import { ThemeToggle } from './ThemeToggle'

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
    <header className="w-full border-b border-gray-200 bg-white text-gray-900 transition-colors duration-300 dark:border-gray-800 dark:bg-[#0a0a0a] dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold transition-opacity hover:opacity-80">
            shortly
          </Link>
          {isLoggedIn && (
            <nav className="hidden items-center gap-4 text-sm text-gray-600 transition-colors duration-200 dark:text-gray-300 md:flex">
              <Link href="/dashboard" className="hover:opacity-80">
                Dashboard
              </Link>
              <Link href="/explore" className="hover:opacity-80">
                Analytics
              </Link>
              <Link href="/feedback" className="hover:opacity-80">
                Feedback
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 transition-colors duration-300 dark:text-gray-300">
          <ThemeToggle />
          <span className="hidden select-none sm:inline-block">Version 1.0 alpha</span>
          {isLoggedIn && !loadingSession && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-gray-700 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
