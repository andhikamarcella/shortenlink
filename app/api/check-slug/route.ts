import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabaseClientServer'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { available: false, error: 'Missing slug' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { available: false, error: 'Supabase not configured' },
      { status: 500 }
    )
  }

  const { data, error } = await supabase
    .from('links')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('[check-slug] supabase error:', error)
    return NextResponse.json(
      { available: false, error: error.message ?? 'Query failed' },
      { status: 500 }
    )
  }

  const available = !data
  return NextResponse.json({ available })
}
