'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const syncSession = async () => {
      // 1. Normalize the URL.
      // Supabase sometimes redirects back with a trailing "#", e.g. /auth/callback#
      // That can interfere with cookie/session detection.
      if (typeof window !== 'undefined' && window.location.hash === '#') {
        const cleanUrl = window.location.origin + window.location.pathname
        // Replace the URL in the address bar without reloading.
        window.history.replaceState(null, '', cleanUrl)
      }

      // 2. Ask Supabase for the current session.
      // In a correct flow, after OAuth redirect, Supabase should have set
      // an auth cookie on our production domain. Here we read it.
      let { data, error } = await supabaseBrowser.auth.getSession()

      // 3. If we didn't get a session immediately, try one more time.
      //    (Some environments need a second check after hash has been removed.)
      if (error || !data?.session) {
        const secondTry = await supabaseBrowser.auth.getSession()
        data = secondTry.data
        error = secondTry.error
      }

      // 4. If we have a session now, we're logged in -> go to dashboard.
      if (!error && data?.session) {
        router.replace('/dashboard')
        return
      }

      // 5. If still no session, send them back to /auth to try again.
      router.replace('/auth')
    }

    syncSession()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p>Signing you in...</p>
    </main>
  )
}

//
// Notes:
// - We FIRST remove the "#" fragment from the URL (if present).
//   Supabase sometimes sends users to /auth/callback# instead of /auth/callback.
//   That breaks cookie recognition in some browsers.
// - After normalizing the URL, we call getSession() to read the cookie.
// - If we get a session, we redirect to /dashboard.
// - If not, we redirect back to /auth.
// - This prevents the infinite loop where we keep bouncing between /auth and /auth/callback#.
//
