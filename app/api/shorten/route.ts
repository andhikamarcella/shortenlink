import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';

const slugPattern = /^[a-z0-9-]{1,24}$/;

function sanitizeUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function generateRandomSlug(length = 7): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let output = '';

  for (let index = 0; index < length; index += 1) {
    output += alphabet[bytes[index] % alphabet.length];
  }

  return output;
}

function getProjectRef(): string | null {
  const source = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!source) {
    return null;
  }

  try {
    const host = new URL(source).hostname;
    const [ref] = host.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

function extractAccessToken(request: Request): string | null {
  const headerToken = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.slice(7).trim();
  }

  const store = cookies();
  const direct = store.get('sb-access-token')?.value;
  if (direct) {
    return direct;
  }

  const projectRef = getProjectRef();
  if (!projectRef) {
    return null;
  }

  const prefixed = store.get(`sb-${projectRef}-access-token`)?.value;
  if (prefixed) {
    return prefixed;
  }

  const authCookie = store.get(`sb-${projectRef}-auth-token`)?.value;
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie) as {
        access_token?: string;
        currentSession?: { access_token?: string } | null;
      };
      return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  const body = payload as {
    url?: unknown;
    slug?: unknown;
    original_url?: unknown;
    custom_slug?: unknown;
  };

  const rawUrl =
    typeof body.url === 'string'
      ? body.url.trim()
      : typeof body.original_url === 'string'
      ? body.original_url.trim()
      : '';

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const sanitizedUrl = sanitizeUrl(rawUrl);
  if (!sanitizedUrl) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const requestedSlug =
    typeof body.slug === 'string'
      ? body.slug.trim().toLowerCase()
      : typeof body.custom_slug === 'string'
      ? body.custom_slug.trim().toLowerCase()
      : '';

  const supabase = createServerSupabaseClient();

  let finalSlug: string | null = null;

  if (requestedSlug) {
    if (!slugPattern.test(requestedSlug)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('links')
      .select('id')
      .eq('slug', requestedSlug)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: 'Failed to verify slug' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    finalSlug = requestedSlug;
  } else {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateRandomSlug();
      const { data: collision, error: collisionError } = await supabase
        .from('links')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (collisionError) {
        return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
      }

      if (!collision) {
        finalSlug = candidate;
        break;
      }
    }

    if (!finalSlug) {
      return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
    }
  }

  const accessToken = extractAccessToken(request);
  let userId: string | null = null;

  if (accessToken) {
    const { data: userData } = await supabase.auth.getUser(accessToken);
    if (userData?.user) {
      userId = userData.user.id;
    }
  }

  const slugToUse = finalSlug;
  if (!slugToUse) {
    return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('links')
    .insert([
      {
        slug: slugToUse,
        original_url: sanitizedUrl,
        user_id: userId,
        is_public: true,
        clicks: 0,
      },
    ])
    .select('slug, clicks, created_at')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: 'Failed to create short link' }, { status: 500 });
  }

  const baseOrigin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://shortenlink-snowy.vercel.app';

  const shortBase = baseOrigin.replace(/\/$/, '');

  return NextResponse.json(
    {
      slug: inserted.slug,
      shortUrl: `${shortBase}/${inserted.slug}`,
      clicks: inserted.clicks ?? 0,
      created_at: inserted.created_at,
    },
    { status: 201 }
  );
}
