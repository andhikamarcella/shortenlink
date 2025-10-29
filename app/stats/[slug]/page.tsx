import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default async function StatsPage({
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
    .select('slug, url, clicks, created_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://shortly.example.com';

  const shortUrl = `${origin.replace(/\/$/, '')}/${data.slug}`;
  const domain = getHostname(data.url);
  const createdAt = new Date(data.created_at).toLocaleString();
  const baseline = Math.max(1, data.clicks || 1);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold">
        Stats for <span className="text-blue-600">{data.slug}</span>
      </h1>
      <p>
        <strong>Original URL:</strong>{' '}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          {domain}
        </a>
      </p>
      <p>
        <strong>Short URL:</strong> <code>{shortUrl}</code>
      </p>
      <p>
        <strong>Clicks:</strong> {data.clicks ?? 0}
      </p>
      <p>
        <strong>Created At:</strong> {createdAt}
      </p>
      <div className="mt-6 text-sm text-gray-500">
        (Baseline clicks: {baseline})
      </div>
    </section>
  );
}
