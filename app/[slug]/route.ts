import { NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabaseClientServer'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug

  if (!slug) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl, { status: 302 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 },
    )
  }

  const { data, error } = await supabase
    .from('links')
    .select('url')
    .eq('slug', slug)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('[redirect] failed to look up slug:', error)
    return NextResponse.json(
      { error: 'Failed to look up slug' },
      { status: 500 },
    )
  }

  if (!data?.url) {
    return new Response('Not found', { status: 404 })
  }

  return NextResponse.redirect(data.url, { status: 302 })
}
