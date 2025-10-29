import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServiceSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface RedirectPageProps {
  params: {
    slug: string;
  };
}

export default async function RedirectPage({ params }: RedirectPageProps) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from('links').select('*').eq('slug', params.slug).maybeSingle();

  if (error) {
    console.error('Error fetching slug', error);
  }

  if (data) {
    await supabase
      .from('links')
      .update({ clicks: data.clicks + 1 })
      .eq('id', data.id);

    redirect(data.original_url);
  }

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100">Link not found</h1>
      <p className="text-lg text-slate-600 dark:text-slate-300">
        We couldn&apos;t find a link for <span className="font-semibold">{params.slug}</span>. It may have expired or been deleted.
      </p>
      <Link
        href="/"
        className="focus-ring inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-base font-semibold text-white shadow hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
      >
        Create your own link
      </Link>
    </section>
  );
}
