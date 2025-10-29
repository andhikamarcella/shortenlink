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

  const { data, error } = await supabase
    .from('links')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json(
      { available: false, error: error.message },
      { status: 500 }
    )
  }

  const isAvailable = !data
  return NextResponse.json({ available: isAvailable })
}
