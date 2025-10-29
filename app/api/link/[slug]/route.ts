import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
  _request: Request,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { message: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const user = null as { id: string } | null;

  const { data: link, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !link) {
    return NextResponse.json(
      { message: 'Link not found' },
      { status: 404 }
    );
  }

  if (link.user_id && user && link.user_id !== user.id) {
    return NextResponse.json(
      { message: 'You do not have permission to delete this link.' },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase
    .from('links')
    .delete()
    .eq('id', link.id);

  if (deleteError) {
    return NextResponse.json(
      { message: 'Failed to delete link' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: 'Deleted successfully' },
    { status: 200 }
  );
}
