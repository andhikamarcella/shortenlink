'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import type { Database } from './types'

export const supabaseBrowser = createClientComponentClient<Database>()

//
// Notes:
// - This helper exposes the browser Supabase client configured with auth-helpers
//   so OAuth callbacks persist sessions via cookies.
// - Only call this file from client components (the module itself is marked as
//   a client boundary).
//
