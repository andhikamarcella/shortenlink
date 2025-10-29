import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

interface ShortenPayload {
  slug?: string;
  destination_url?: string;
  url?: string;
  user_id?: string | null;
}

const generateSlug = () => Math.random().toString(36).slice(2, 10);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShortenPayload;
    const destinationUrl = (body.destination_url ?? body.url ?? '').trim();
    let slug = (body.slug ?? '').trim().toLowerCase();
    const userId = body.user_id ?? null;

    if (!destinationUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing destination_url' },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = generateSlug();
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { error } = await supabase.from('links').insert([
      {
        slug,
        destination_url: destinationUrl,
        user_id: userId,
      },
    ]);

    if (error) {
      if ('code' in error && (error as { code?: string }).code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Slug is already in use.' },
          { status: 409 }
        );
      }

      console.error('[shorten] insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create short link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, slug }, { status: 200 });
  } catch (error) {
    console.error('[shorten] exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
