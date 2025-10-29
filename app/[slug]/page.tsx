import { redirect, notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('links')
    .select('*')
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

  redirect(data.original_url);
}
