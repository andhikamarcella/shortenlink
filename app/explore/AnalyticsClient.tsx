'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const shortBase = process.env.NEXT_PUBLIC_BASE_URL ?? '';

const buildShortUrl = (slug: string) => {
  if (shortBase) return `${shortBase}/${slug}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${slug}`;
  }
  return `/${slug}`;
};

type AnalyticsUser = {
  id: string;
  email: string | null;
  isModerator: boolean;
};

type LinkRow = {
  id: string;
  slug: string;
  destination_url: string | null;
  url: string | null;
  created_at: string;
  clicks_count: number | null;
  user_id: string | null;
};

type NormalizedLink = {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  clicks_count: number;
  user_id: string | null;
};

type ClickRow = {
  slug: string;
  country: string | null;
  created_at: string;
};

type DailyClicks = { date: string; clicks: number };

type CountryShare = { country: string; percent: number; total: number };

type TopLink = { slug: string; totalClicks: number; destination_url: string };

const formatDateLabel = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

export function AnalyticsClient({ user }: { user: AnalyticsUser }) {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const params = useSearchParams();
  const selectedSlug = params.get('slug');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyClicks, setDailyClicks] = useState<DailyClicks[]>([]);
  const [countryShare, setCountryShare] = useState<CountryShare[]>([]);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    let linksQuery = supabase
      .from('links')
      .select('id, slug, destination_url, url, created_at, clicks_count, user_id')
      .order('created_at', { ascending: false });

    if (!user.isModerator) {
      linksQuery = linksQuery.eq('user_id', user.id);
    }

    if (selectedSlug) {
      linksQuery = linksQuery.eq('slug', selectedSlug);
    }

    const { data: linkRows, error: linkError } = await linksQuery;

    if (linkError) {
      console.error('[analytics] failed to load links', linkError.message);
      setError('Failed to load analytics.');
      setLoading(false);
      return;
    }

    const relevantLinks: NormalizedLink[] = (linkRows ?? []).map((link) => ({
      id: link.id,
      slug: link.slug,
      destination_url: link.destination_url ?? link.url ?? '',
      created_at: link.created_at,
      clicks_count: link.clicks_count ?? 0,
      user_id: link.user_id,
    }));

    const slugs = relevantLinks.map((link) => link.slug);
    if (slugs.length === 0) {
      setDailyClicks([]);
      setCountryShare([]);
      setTopLinks([]);
      setTotalClicks(0);
      setLoading(false);
      return;
    }

    let clicksQuery = supabase
      .from('clicks')
      .select('slug, country, created_at')
      .order('created_at', { ascending: true });

    if (selectedSlug) {
      clicksQuery = clicksQuery.eq('slug', selectedSlug);
    } else if (!user.isModerator) {
      clicksQuery = clicksQuery.in('slug', slugs);
    }

    const { data: clickRows, error: clickError } = await clicksQuery;

    if (clickError) {
      console.error('[analytics] failed to load clicks', clickError.message);
      setError('Failed to load analytics.');
      setDailyClicks([]);
      setCountryShare([]);
      setTopLinks([]);
      setTotalClicks(0);
      setLoading(false);
      return;
    }

    const clicks = (clickRows ?? []) as ClickRow[];

    const dailyMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    const slugMap = new Map<string, number>();

    clicks.forEach((click) => {
      const dateKey = click.created_at.slice(0, 10);
      const country = (click.country ?? 'Unknown') || 'Unknown';
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
      slugMap.set(click.slug, (slugMap.get(click.slug) ?? 0) + 1);
    });

    const dailySeries: DailyClicks[] = Array.from(dailyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, clicks]) => ({ date, clicks }));

    const totalFallback = relevantLinks.reduce(
      (sum, link) => sum + (link.clicks_count ?? 0),
      0
    );
    const total = clicks.length > 0 ? clicks.length : totalFallback;
    const countries: CountryShare[] = Array.from(countryMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([country, count]) => ({
        country,
        total: count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    const top: TopLink[] = relevantLinks
      .map((link) => ({
        slug: link.slug,
        destination_url: link.destination_url,
        totalClicks:
          (clicks.length > 0 ? slugMap.get(link.slug) : link.clicks_count) ?? 0,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 5);

    setDailyClicks(dailySeries);
    setCountryShare(countries);
    setTopLinks(top);
    setTotalClicks(total);
    setLoading(false);
  }, [selectedSlug, supabase, user.id, user.isModerator]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (user.isModerator) {
      // TODO: if isModerator(user.email) render feedback/chat moderation panel here
    }
  }, [user.isModerator]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
          <h1 className="text-2xl font-semibold text-zinc-100">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Traffic insights for your short links.</p>
          {selectedSlug && (
            <p className="mt-2 text-xs text-indigo-300">
              Filtering analytics for <span className="font-mono">{buildShortUrl(selectedSlug)}</span>
            </p>
          )}
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Traffic overview</h2>
              <span className="text-sm text-zinc-400">Total clicks: {totalClicks}</span>
            </div>
            <div className="mt-4 h-64 w-full">
              {loading ? (
                <p className="text-sm text-zinc-400">Loading analytics…</p>
              ) : dailyClicks.length === 0 ? (
                <p className="text-sm text-zinc-500">No click activity yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyClicks}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateLabel}
                      stroke="#52525b"
                      tick={{ fill: '#d4d4d8', fontSize: 12 }}
                    />
                    <YAxis stroke="#52525b" tick={{ fill: '#d4d4d8', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(24,24,27,0.9)',
                        border: '1px solid rgba(82,82,91,0.7)',
                        borderRadius: '0.75rem',
                        color: '#fafafa',
                        fontSize: '0.75rem',
                      }}
                      labelFormatter={(value) => formatDateLabel(value as string)}
                    />
                    <Area type="monotone" dataKey="clicks" stroke="#818cf8" fill="url(#colorClicks)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-zinc-100">Where your visitors are from</h2>
            <p className="mt-1 text-sm text-zinc-400">Country breakdown across your clicks.</p>
            {loading ? (
              <p className="mt-4 text-sm text-zinc-400">Loading…</p>
            ) : countryShare.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No geo data yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {countryShare.map((entry) => (
                  <li key={entry.country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-zinc-300">
                      <span>{entry.country}</span>
                      <span>{entry.percent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800/80">
                      <div
                        className="h-full rounded-full bg-indigo-500/70"
                        style={{ width: `${Math.max(entry.percent, 4)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-zinc-100">Top links</h2>
            <p className="mt-1 text-sm text-zinc-400">Your most visited short links.</p>
            {loading ? (
              <p className="mt-4 text-sm text-zinc-400">Loading…</p>
            ) : topLinks.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No links have received clicks yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-zinc-200">
                {topLinks.map((link) => (
                  <li
                    key={link.slug}
                    className="rounded-xl border border-zinc-800/60 bg-black/30 px-3 py-2 shadow-sm transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-300">{buildShortUrl(link.slug)}</span>
                      <span className="text-xs text-zinc-400">{link.totalClicks} clicks</span>
                    </div>
                    <p className="mt-1 break-all text-xs text-zinc-500">{link.destination_url}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="pb-8 text-right text-xs text-zinc-500">
          shortly · version {process.env.NEXT_PUBLIC_APP_VERSION || '1.0-alpha'}
        </footer>
      </div>
    </main>
  );
}
