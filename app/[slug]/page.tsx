import { redirect, notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
      },
    }
  );

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
