import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

interface ShortenPayload {
  slug?: string;
  url?: string;
  user_id?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShortenPayload;
    const { slug, url, user_id } = body;

    if (!slug || !url) {
      return NextResponse.json(
        { success: false, error: 'Missing slug or url' },
        { status: 400 }
      );
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
        url,
        user_id: user_id ?? null,
      },
    ]);

    if (error) {
      console.error('[shorten] insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[shorten] exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
