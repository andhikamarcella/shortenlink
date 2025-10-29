import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

const slugPattern = /^[a-z0-9-]+$/;

function normalizeUrl(value: string): string | null {
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

function generateRandomSlug(): string {
  let slug = '';
  while (slug.length < 7) {
    slug += Math.random().toString(36).slice(2);
  }
  return slug.slice(0, 7);
}

function getAccessToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) {
    return token;
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { original_url, custom_slug } = body as {
    original_url?: unknown;
    custom_slug?: unknown;
  };

  if (typeof original_url !== 'string' || original_url.trim().length === 0) {
    return NextResponse.json({ message: 'Invalid URL' }, { status: 400 });
  }

  const sanitizedUrl = normalizeUrl(original_url);
  if (!sanitizedUrl) {
    return NextResponse.json({ message: 'Invalid URL' }, { status: 400 });
  }

  let finalSlug: string | null = null;

  if (typeof custom_slug === 'string' && custom_slug.trim().length > 0) {
    const desired = custom_slug.trim().toLowerCase();
    if (!slugPattern.test(desired)) {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabase
      .from('links')
      .select('id')
      .eq('slug', desired)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ message: 'Failed to verify slug availability' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ message: 'Slug already taken' }, { status: 409 });
    }

    finalSlug = desired;
  } else {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateRandomSlug();
      const { data: collision, error: collisionError } = await supabase
        .from('links')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (collisionError) {
        return NextResponse.json({ message: 'Failed to generate slug' }, { status: 500 });
      }

      if (!collision) {
        finalSlug = candidate;
        break;
      }
    }

    if (!finalSlug) {
      return NextResponse.json({ message: 'Failed to generate slug' }, { status: 500 });
    }
  }

  const accessToken = getAccessToken(request);
  let userId: string | null = null;

  if (accessToken) {
    const { data: userData } = await supabase.auth.getUser(accessToken);
    if (userData?.user) {
      userId = userData.user.id;
    }
  }

  const slugToUse = finalSlug;

  if (!slugToUse) {
    return NextResponse.json({ message: 'Failed to generate slug' }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('links')
    .insert([
      {
        slug: slugToUse,
        original_url: sanitizedUrl,
        user_id: userId,
        clicks: 0,
        is_public: true,
      },
    ])
    .select('slug, clicks, created_at')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ message: 'Failed to create short link' }, { status: 500 });
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
