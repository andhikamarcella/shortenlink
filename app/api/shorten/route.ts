import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidHttpUrl, sanitizeUrl } from '@/lib/validateUrl';
import { checkRateLimit } from '@/lib/rateLimit';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { generateSlug, slugPattern } from '@/lib/slug';

const requestSchema = z.object({
  original_url: z.string(),
  custom_slug: z.string().max(24).optional(),
  is_public: z.boolean().optional(),
  user_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ message: 'Rate limit exceeded. Try again in a few minutes.' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request.', details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const sanitizedUrl = sanitizeUrl(body.original_url);

  if (!isValidHttpUrl(sanitizedUrl)) {
    return NextResponse.json({ message: 'Please provide a valid http(s) URL.' }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  let slug = body.custom_slug?.toLowerCase();
  if (slug) {
    if (!slugPattern.test(slug)) {
      return NextResponse.json({ message: 'Slug can only contain letters, numbers, or hyphens.' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('links').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      return NextResponse.json({ message: 'This slug is already taken.' }, { status: 409 });
    }
  } else {
    let attempts = 0;
    while (!slug && attempts < 5) {
      const candidate = generateSlug(6 + Math.floor(Math.random() * 3));
      const { data: existing } = await supabase.from('links').select('id').eq('slug', candidate).maybeSingle();
      if (!existing) {
        slug = candidate;
      }
      attempts += 1;
    }

    if (!slug) {
      return NextResponse.json({ message: 'Unable to generate a unique slug. Please try again.' }, { status: 500 });
    }
  }

  const { error } = await supabase.from('links').insert({
    slug,
    original_url: sanitizedUrl,
    user_id: body.user_id ?? null,
    is_public: body.is_public ?? true,
  });

  if (error) {
    console.error('Error creating link', error);
    return NextResponse.json({ message: 'Failed to save link.' }, { status: 500 });
  }

  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';
  const shortUrl = `${origin.replace(/\/$/, '')}/${slug}`;

  return NextResponse.json({ shortUrl, slug });
}
