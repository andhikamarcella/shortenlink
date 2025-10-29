import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

function generateRandomSlug(length: number = 7): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let slug = '';

  for (let i = 0; i < length; i += 1) {
    slug += characters[bytes[i] % characters.length];
  }

  return slug;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

export async function POST(request: Request) {
  const body = await request.json();
  const rawUrl = typeof body.original_url === 'string' ? body.original_url.trim() : '';
  const desiredSlug = typeof body.custom_slug === 'string' ? body.custom_slug.trim() : undefined;
  const requestedPublic = body.is_public === undefined ? true : Boolean(body.is_public);
  const requestUserId = typeof body.user_id === 'string' ? body.user_id : null;

  if (!isValidHttpUrl(rawUrl)) {
    return NextResponse.json({ message: 'Invalid URL' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: { persistSession: false },
    }
  );

  const sanitizedUrl = rawUrl;
  let finalSlug: string;

  if (desiredSlug && desiredSlug.length > 0) {
    const cleaned = sanitizeSlug(desiredSlug);

    if (!cleaned) {
      return NextResponse.json({ message: 'Invalid custom slug' }, { status: 400 });
    }

    const { data: existing, error: existsError } = await supabase
      .from('links')
      .select('id')
      .eq('slug', cleaned)
      .maybeSingle();

    if (existsError) {
      return NextResponse.json({ message: 'Failed to check slug availability' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ message: 'Slug already taken' }, { status: 409 });
    }

    finalSlug = cleaned;
  } else {
    let generated = '';
    while (!generated) {
      const candidate = generateRandomSlug();
      const { data: taken, error: takenError } = await supabase
        .from('links')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (takenError) {
        return NextResponse.json({ message: 'Failed to generate slug' }, { status: 500 });
      }

      if (!taken) {
        generated = candidate;
      }
    }

    finalSlug = generated;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('links')
    .insert([
      {
        slug: finalSlug,
        original_url: sanitizedUrl,
        user_id: requestUserId,
        clicks: 0,
        is_public: requestedPublic,
      },
    ])
    .select('*')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ message: 'Failed to create short link' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.FALLBACK_BASE_URL ?? '';
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const shortUrl = normalizedBase ? `${normalizedBase}/${inserted.slug}` : `/${inserted.slug}`;

  return NextResponse.json(
    {
      slug: inserted.slug,
      shortUrl,
      clicks: inserted.clicks,
      created_at: inserted.created_at,
    },
    { status: 201 }
  );
}
