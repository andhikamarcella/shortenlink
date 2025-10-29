import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const newClicks = (data.clicks ?? 0) + 1;

  const { error: updateError } = await supabase
    .from('links')
    .update({ clicks: newClicks })
    .eq('id', data.id);

  if (updateError) {
    notFound();
  }

  redirect(data.original_url);
}
