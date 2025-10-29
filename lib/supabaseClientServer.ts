import { createClient } from '@supabase/supabase-js'

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.error('[supabase] missing env')
    return null
  }

  return createClient(url, anon)
}
