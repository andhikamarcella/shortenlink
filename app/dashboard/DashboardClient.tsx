'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FeedbackPanel } from '@/app/components/FeedbackPanel';
import { slugPattern } from '@/lib/slug';
import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser';

type DashboardUser = {
  id: string;
  email: string | null;
  isModerator: boolean;
};

type LinkRow = {
  id: string;
  slug: string;
  destination_url: string;
  created_at: string;
  clicks_count: number;
};

const shortBase = process.env.NEXT_PUBLIC_BASE_URL ?? '';

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildShortUrl = (slug: string) => {
  if (shortBase) return `${shortBase}/${slug}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${slug}`;
  }
  return `/${slug}`;
};

export function DashboardClient({ user }: { user: DashboardUser }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');

  const generateSlug = useCallback(() => Math.random().toString(36).slice(2, 10), []);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('links')
      .select('id, slug, destination_url, url, created_at, clicks_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[dashboard] failed to load links', fetchError.message);
      setError('Failed to load your links.');
      setLinks([]);
      setLoading(false);
      return;
    }

    const normalised = (data ?? []).map((link) => ({
      id: link.id,
      slug: link.slug,
      destination_url: link.destination_url ?? link.url ?? '',
      created_at: link.created_at,
      clicks_count: link.clicks_count ?? 0,
    }));

    setLinks(normalised);
    setLoading(false);
  }, [supabase, user.id]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    if (user.isModerator) {
      // TODO: if isModerator(user.email) render feedback/chat moderation panel here
    }
  }, [user.isModerator]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/auth');
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/');
  }, [router, supabase]);

  const handleCopy = useCallback(async (slug: string) => {
    const shortUrl = buildShortUrl(slug);
    await navigator.clipboard.writeText(shortUrl);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleDelete = useCallback(
    async (linkId: string) => {
      const confirmed = window.confirm('Are you sure you want to delete this short link?');
      if (!confirmed) return;

      const { error: deleteError } = await supabase.from('links').delete().eq('id', linkId);
      if (deleteError) {
        console.error('[dashboard] failed to delete link', deleteError.message);
        setError('Unable to delete link right now.');
        return;
      }

      await fetchLinks();
    },
    [fetchLinks, supabase]
  );

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCreateError(null);

      const trimmedUrl = destinationUrl.trim();
      if (!trimmedUrl) {
        setCreateError('Please enter a destination URL.');
        return;
      }

      setCreating(true);

      let slug = customSlug.trim().toLowerCase();
      if (!slug) {
        slug = generateSlug();
      } else if (!slugPattern.test(slug)) {
        setCreateError('Slug may only include letters, numbers, or hyphens.');
        setCreating(false);
        return;
      }

      const payload: Record<string, unknown> = {
        slug,
        destination_url: trimmedUrl,
        user_id: user.id,
      };

      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({ success: false, error: 'Unknown error' }));

      if (!response.ok || !result.success) {
        setCreateError(result.error || 'Failed to create link.');
        setCreating(false);
        return;
      }

      setDestinationUrl('');
      setCustomSlug('');
      setCreating(false);
      await fetchLinks();
    },
    [customSlug, destinationUrl, fetchLinks, generateSlug, user.id]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Your links</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage the URLs you have shortened with shortly.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
              type="button"
            >
              Create new link
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-zinc-700/60 bg-black/30 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500"
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-zinc-100">Create a link</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Generate a new short link right from your dashboard.
          </p>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr,auto]">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-200" htmlFor="dashboard-destination">
                Destination URL
              </label>
              <input
                id="dashboard-destination"
                type="url"
                required
                placeholder="https://example.com"
                className="w-full rounded-lg border border-zinc-700/60 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-200" htmlFor="dashboard-slug">
                Custom slug (optional)
              </label>
              <input
                id="dashboard-slug"
                placeholder="your-custom-slug"
                className="w-full rounded-lg border border-zinc-700/60 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Shorten URL'}
              </button>
            </div>
          </form>
          {createError && <p className="mt-3 text-sm text-rose-400">{createError}</p>}
        </section>

        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-zinc-100">Saved links</h2>
          <p className="mt-1 text-sm text-zinc-400">All of your short links in one place.</p>

          {loading ? (
            <p className="mt-6 text-sm text-zinc-400">Loading your links…</p>
          ) : error ? (
            <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          ) : links.length === 0 ? (
            <div className="mt-6 rounded-xl border border-zinc-800/60 bg-black/40 p-6 text-center text-sm text-zinc-400">
              You haven&apos;t created any links yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {links.map((link) => {
                const shortUrl = buildShortUrl(link.slug);
                return (
                  <div
                    key={link.id}
                    className="flex flex-col gap-4 rounded-xl border border-zinc-800/60 bg-black/30 p-4 text-sm text-zinc-100 shadow-md md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base text-indigo-300">{shortUrl}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(link.slug)}
                          className="rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:border-indigo-400 hover:text-white"
                        >
                          {copied === link.slug ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(shortUrl, '_blank', 'noopener,noreferrer')}
                          className="rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:border-indigo-400 hover:text-white"
                        >
                          Open
                        </button>
                      </div>
                      <p className="break-all text-sm text-zinc-400">{link.destination_url}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        <span>Created: {formatTimestamp(link.created_at)}</span>
                        <span>{link.clicks_count ?? 0} clicks</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <button
                        type="button"
                        onClick={() => router.push(`/explore?slug=${encodeURIComponent(link.slug)}`)}
                        className="w-full rounded-md border border-indigo-500/40 bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/30 md:w-auto"
                      >
                        View analytics
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        className="w-full rounded-md border border-rose-500/40 bg-rose-600/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20 md:w-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <FeedbackPanel userId={user.id} email={user.email} />

        <footer className="pb-8 text-right text-xs text-zinc-500">
          shortly · version {process.env.NEXT_PUBLIC_APP_VERSION || '1.0-alpha'}
        </footer>
      </div>
    </main>
  );
}
