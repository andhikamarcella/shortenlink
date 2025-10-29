import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

export async function DELETE(
  request: Request,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

  const supabase = getSupabaseServerClient();

  const user = null as { id: string } | null;

  const { data: link, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !link) {
    return NextResponse.json({ message: 'Link not found' }, { status: 404 });
  }

  if (link.user_id && user && link.user_id !== user.id) {
    return NextResponse.json(
      { message: 'You do not have permission to delete this link.' },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase.from('links').delete().eq('id', link.id);

  if (deleteError) {
    return NextResponse.json(
      { message: 'Failed to delete link' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
}
