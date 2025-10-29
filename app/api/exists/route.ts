import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { slugPattern } from '@/lib/slug';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug || !slugPattern.test(slug)) {
    return NextResponse.json(
      { available: false, message: 'Invalid slug format' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('links')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, message: 'Lookup failed' },
      { status: 500 }
    );
  }

  const isTaken = Boolean(data);

  return NextResponse.json(
    {
      available: !isTaken,
      message: !isTaken ? 'Slug is available' : 'Slug is already taken',
    },
    { status: 200 }
  );
}
