'use client'

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = createClient(url, anon)

//
// Notes:
// - This file is ONLY for client components ("use client").
// - We do not import service role here, only anon.
//
