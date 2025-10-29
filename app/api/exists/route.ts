import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { slugPattern } from '@/lib/slug';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug || !slugPattern.test(slug)) {
    return NextResponse.json({ exists: false });
  }

  const supabase = createServiceSupabaseClient();
  const { data } = await supabase.from('links').select('id').eq('slug', slug.toLowerCase()).maybeSingle();

  return NextResponse.json({ exists: Boolean(data) });
}
