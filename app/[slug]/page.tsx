import { redirect, notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('links')
    .select('id, slug, url, clicks')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const newClicks = (data.clicks ?? 0) + 1;

  await supabase
    .from('links')
    .update({ clicks: newClicks })
    .eq('id', data.id);

  redirect(data.url);
}
