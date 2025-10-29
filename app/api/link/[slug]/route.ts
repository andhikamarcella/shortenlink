import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';
import { slugPattern } from '@/lib/slug';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!slugPattern.test(params.slug)) {
    return NextResponse.json({ message: 'Invalid slug.' }, { status: 400 });
  }

  const supabase = createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceSupabaseClient();
  const { data: link } = await admin.from('links').select('id, user_id').eq('slug', params.slug).maybeSingle();

  if (!link) {
    return NextResponse.json({ message: 'Link not found.' }, { status: 404 });
  }

  if (link.user_id && link.user_id !== user.id) {
    return NextResponse.json({ message: 'You do not have permission to delete this link.' }, { status: 403 });
  }

  const { error } = await admin.from('links').delete().eq('id', link.id);
  if (error) {
    console.error('Failed to delete link', error);
    return NextResponse.json({ message: 'Failed to delete link.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
