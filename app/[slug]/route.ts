import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;

  if (!slug) {
    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('links')
    .select('destination_url, url, clicks_count')
    .eq('slug', slug)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[redirect] failed to look up slug:', error);
    return NextResponse.json({ error: 'Failed to look up slug' }, { status: 500 });
  }

  if (!data) {
    return new Response('Not found', { status: 404 });
  }

  const destination = data.destination_url ?? data.url ?? null;

  if (!destination) {
    return new Response('Not found', { status: 404 });
  }

  const adminClient = getSupabaseServerClient({ admin: true });
  const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

  if (adminClient) {
    const [{ error: clickError }, { error: incrementError }] = await Promise.all([
      adminClient.from('clicks').insert({ slug, country }),
      adminClient
        .from('links')
        .update({ clicks_count: (data.clicks_count ?? 0) + 1 })
        .eq('slug', slug),
    ]);

    if (clickError) {
      console.error('[redirect] failed to record click:', clickError.message);
    }

    if (incrementError) {
      console.error('[redirect] failed to increment click count:', incrementError.message);
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}
