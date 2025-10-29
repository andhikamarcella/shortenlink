import { Metadata } from 'next';
import Link from 'next/link';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const revalidate = 30;

interface StatsPageProps {
  params: {
    slug: string;
  };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
}

export async function generateMetadata({ params }: StatsPageProps): Promise<Metadata> {
  return {
    title: `Stats for ${params.slug} — shortly`,
  };
}

export default async function StatsPage({ params }: StatsPageProps) {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('links')
    .select('slug, original_url, clicks, created_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://shortly.example.com';
  const shortUrl = `${origin.replace(/\/$/, '')}/${data.slug}`;
  const domain = getHostname(data.original_url);
  const createdAt = new Date(data.created_at).toLocaleString();
  const baseline = Math.max(1, data.clicks || 1);
  const bars = Array.from({ length: 7 }, (_, index) => Math.max(10, Math.round((baseline / 7) * (index + 1))));

  return (
    <section className="mx-auto w-full max-w-4xl space-y-10 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Stats for /{data.slug}</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Track how your short link performs. Share this page with teammates or partners.
        </p>
      </header>

      <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Short URL</p>
          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">{shortUrl}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Destination</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{domain}</p>
          <Link
            href={data.original_url}
            className="focus-ring inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Visit original URL
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-primary-50 p-4 text-primary-800 dark:bg-primary-500/20 dark:text-primary-100">
            <p className="text-sm font-medium">Total clicks</p>
            <p className="text-3xl font-semibold">{data.clicks}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <p className="text-sm font-medium">Created</p>
            <p className="text-3xl font-semibold">{createdAt}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Engagement trend</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Placeholder chart</span>
          </div>
          <div className="flex h-40 items-end gap-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700" role="img" aria-label="Placeholder bar chart showing weekly clicks">
            {bars.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-xl bg-gradient-to-t from-primary-200 to-primary-500 dark:from-primary-500/30 dark:to-primary-400"
                style={{ height: `${Math.min(100, height)}%` }}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Detailed analytics (locations, referrers, devices) are coming soon. For now, use this page to share core metrics.
          </p>
        </div>
      </div>
    </section>
  );
}
