import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';

const slugRegex = /^[a-z0-9-]{1,24}$/;

function generateRandomSlug(length = 6): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const entropy = randomBytes(length);
  let result = '';

  for (let index = 0; index < length; index += 1) {
    result += alphabet[entropy[index] % alphabet.length];
  }

  return result;
}

function sanitizeHttpUrl(value: string): string | null {
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

function extractAccessTokenFromCookies(): string | null {
  const store = cookies();
  const direct = store.get('sb-access-token')?.value;
  if (direct) {
    return direct;
  }

  const projectRef = getProjectRef();
  if (!projectRef) {
    return null;
  }

  const prefixedAccess = store.get(`sb-${projectRef}-access-token`)?.value;
  if (prefixedAccess) {
    return prefixedAccess;
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

async function resolveUserId(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  request: Request
): Promise<string | null> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  let accessToken: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.slice(7).trim();
  }

  if (!accessToken) {
    accessToken = extractAccessTokenFromCookies();
  }

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return null;
  }

  return data.user.id;
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

  const rawUrlInput =
    typeof body.url === 'string'
      ? body.url.trim()
      : typeof body.original_url === 'string'
      ? body.original_url.trim()
      : '';

  if (!rawUrlInput) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const sanitizedUrl = sanitizeHttpUrl(rawUrlInput);
  if (!sanitizedUrl) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const providedSlug =
    typeof body.slug === 'string'
      ? body.slug.trim()
      : typeof body.custom_slug === 'string'
      ? body.custom_slug.trim()
      : '';

  const supabase = createServerSupabaseClient();

  let finalSlug: string | null = null;

  if (providedSlug) {
    const normalized = providedSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!normalized || !slugRegex.test(normalized)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('links')
      .select('id')
      .eq('slug', normalized)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: 'Failed to verify slug' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    finalSlug = normalized;
  } else {
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = generateRandomSlug();
      const { data: existing, error: lookupError } = await supabase
        .from('links')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (lookupError) {
        return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
      }

      if (!existing) {
        finalSlug = candidate;
        break;
      }
    }

    if (!finalSlug) {
      return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
    }
  }

  const userId = await resolveUserId(supabase, request);

  const { data: inserted, error: insertError } = await supabase
    .from('links')
    .insert([
      {
        slug: finalSlug,
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

  const fallbackBase = 'https://shortenlink-snowy.vercel.app';
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    vercelUrl ??
    request.headers.get('origin') ??
    fallbackBase;
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const shortUrl = `${normalizedBase}/${inserted.slug}`;

  return NextResponse.json(
    {
      slug: inserted.slug,
      shortUrl,
      clicks: inserted.clicks ?? 0,
      created_at: inserted.created_at,
    },
    { status: 201 }
  );
}
