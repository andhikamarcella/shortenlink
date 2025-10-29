import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import type { Database } from '@/lib/types';
import { slugPattern } from '@/lib/slug';
import { isValidHttpUrl, sanitizeUrl } from '@/lib/validateUrl';

interface ShortenPayload {
  slug?: string;
  destination_url?: string;
  url?: string;
}

const MAX_ATTEMPTS = 10;

const randomSlug = () => Math.random().toString(36).slice(2, 10);

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  let payload: ShortenPayload;
  try {
    payload = (await req.json()) as ShortenPayload;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const rawDestination = (payload.destination_url ?? payload.url ?? '').trim();
  const destinationUrl = sanitizeUrl(rawDestination);

  if (!isValidHttpUrl(destinationUrl)) {
    return NextResponse.json(
      { success: false, error: 'Please provide a valid destination URL.' },
      { status: 422 }
    );
  }

  let slug = (payload.slug ?? '').trim().toLowerCase();
  const isCustomSlug = Boolean(slug);

  if (slug && !slugPattern.test(slug)) {
    return NextResponse.json(
      { success: false, error: 'Slug may only include letters, numbers, or hyphens.' },
      { status: 422 }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id ?? null;

  const slugExists = async (candidate: string) => {
    const { data } = await supabase
      .from('links')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    return Boolean(data);
  };

  if (slug) {
    if (await slugExists(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug is already in use.' },
        { status: 409 }
      );
    }
  } else {
    let attempt = 0;
    while (attempt < MAX_ATTEMPTS) {
      const candidate = randomSlug();
      // eslint-disable-next-line no-await-in-loop
      const taken = await slugExists(candidate);
      if (!taken) {
        slug = candidate;
        break;
      }
      attempt += 1;
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Unable to generate an available slug. Please try again.' },
        { status: 500 }
      );
    }
  }

  const insertPayload: Database['public']['Tables']['links']['Insert'] = {
    slug,
    destination_url: destinationUrl,
    url: destinationUrl,
    clicks_count: 0,
    user_id: userId,
  };

  const { error } = await supabase.from('links').insert(insertPayload);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Slug is already in use.' },
        { status: 409 }
      );
    }

    console.error('[shorten] insert error:', error.message);

    return NextResponse.json(
      { success: false, error: 'Failed to create short link.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, slug, custom: isCustomSlug },
    { status: 201 }
  );
}
