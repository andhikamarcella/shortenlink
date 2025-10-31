'use client'

import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './types'

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )

//
// Notes:
// - This helper returns a new Supabase browser client configured to persist
//   OAuth sessions in local storage/cookies so callbacks work reliably in the
//   App Router environment.
// - Call this inside client components (e.g. with useMemo) to avoid creating a
//   fresh instance on every render.
//
