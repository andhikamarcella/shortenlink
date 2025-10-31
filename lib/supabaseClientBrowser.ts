'use client'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './types'

export function createSupabaseBrowserClient() {
  return createClient<Database>(
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
}

//
// Notes:
// - This helper returns a Supabase client configured for browser environments.
// - Instantiate it inside client components (e.g. with useMemo) to reuse the
//   connection while keeping OAuth sessions in sync with Supabase callbacks.
//
