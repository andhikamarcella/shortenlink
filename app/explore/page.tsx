import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { StatCard } from '@/components/StatCard';

export const revalidate = 15;

export const metadata: Metadata = {
  title: 'Explore public links — shortly',
  description: 'Discover trending short links created by the shortly community.',
};

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
}

type LinkSummary = {
  slug: string;
  original_url: string;
  clicks: number;
  created_at: string;
};

export default async function ExplorePage() {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  );

  const [popularResult, latestResult, countResult] = await Promise.all([
    supabase
      .from('links')
      .select('slug, original_url, clicks, created_at')
      .eq('is_public', true)
      .order('clicks', { ascending: false })
      .limit(10),
    supabase
      .from('links')
      .select('slug, original_url, clicks, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true),
  ]);

  const safePopularLinks: LinkSummary[] =
    popularResult.error || !popularResult.data
      ? []
      : popularResult.data.map((link) => ({
          slug: link.slug,
          original_url: link.original_url,
          clicks: link.clicks ?? 0,
          created_at: link.created_at,
        }));

  const safeLatestLinks: LinkSummary[] =
    latestResult.error || !latestResult.data
      ? []
      : latestResult.data.map((link) => ({
          slug: link.slug,
          original_url: link.original_url,
          clicks: link.clicks ?? 0,
          created_at: link.created_at,
        }));

  const publicCount =
    countResult.error || typeof countResult.count !== 'number'
      ? 0
      : countResult.count;

  const totalClicks = safePopularLinks.reduce((acc, link) => acc + link.clicks, 0);

  return (
    <section className="mx-auto w-full max-w-5xl space-y-12 px-4 py-16">
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Explore public links</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          See the top-performing and freshest short links from our community. Every link here opted in to be public.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Public links" value={publicCount} />
        <StatCard label="Total clicks (top 10)" value={totalClicks} />
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Popular links</h2>
          <ul className="space-y-3">
            {safePopularLinks.map((link) => (
              <li
                key={`popular-${link.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">/{link.slug}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{getHostname(link.original_url)}</p>
                  </div>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                    {link.clicks} clicks
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/stats/${link.slug}`}
                    className="focus-ring text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    View stats
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Latest links</h2>
          <ul className="space-y-3">
            {safeLatestLinks.map((link) => (
              <li
                key={`latest-${link.slug}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">/{link.slug}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{getHostname(link.original_url)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {new Date(link.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/stats/${link.slug}`}
                    className="focus-ring text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    View stats
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
