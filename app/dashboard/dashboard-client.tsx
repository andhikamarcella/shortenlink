'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { LinkRow, LinkRecord } from '@/components/LinkRow';
import QRCode from 'qrcode';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface DashboardClientProps {
  initialLinks: Array<{ slug: string; original_url: string; clicks: number; created_at: string }>;
  shortBase: string;
  userEmail: string;
}

type SortOption = 'newest' | 'clicks';

export function DashboardClient({ initialLinks, shortBase, userEmail }: DashboardClientProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [sort, setSort] = useState<SortOption>('newest');
  const [links, setLinks] = useState(initialLinks);
  const [status, setStatus] = useState('');

  const sortedLinks = useMemo(() => {
    const copy = [...links];
    if (sort === 'newest') {
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return copy.sort((a, b) => b.clicks - a.clicks);
  }, [links, sort]);

  const records: LinkRecord[] = sortedLinks.map((link) => ({
    ...link,
    shortUrl: `${shortBase}/${link.slug}`,
  }));

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setStatus('Short link copied to clipboard.');
  };

  const handleDelete = async (slug: string) => {
    const response = await fetch(`/api/link/${slug}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json();
      setStatus(error.message || 'Failed to delete link.');
      return;
    }
    setLinks((prev) => prev.filter((item) => item.slug !== slug));
    setStatus('Link deleted successfully.');
  };

  const generateQr = async (slug: string) => {
    const record = records.find((item) => item.slug === slug);
    const url = record ? record.shortUrl : `${shortBase}/${slug}`;
    return QRCode.toDataURL(url, { margin: 1, width: 512 });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Your dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Signed in as <span className="font-medium">{userEmail}</span>. Manage and share your short links with ease.
            </p>
          </div>
          <Button variant="secondary" onClick={handleSignOut} aria-label="Sign out">
            Sign out
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="focus-ring inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
          >
            Create new link
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Sort by:</span>
            <Button
              variant={sort === 'newest' ? 'primary' : 'secondary'}
              onClick={() => setSort('newest')}
              aria-pressed={sort === 'newest'}
            >
              Newest
            </Button>
            <Button
              variant={sort === 'clicks' ? 'primary' : 'secondary'}
              onClick={() => setSort('clicks')}
              aria-pressed={sort === 'clicks'}
            >
              Clicks
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-6" aria-live="polite">
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:block">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <th scope="col" className="px-6 py-4">
                  Slug
                </th>
                <th scope="col" className="px-6 py-4">
                  Original URL
                </th>
                <th scope="col" className="px-6 py-4">
                  Clicks
                </th>
                <th scope="col" className="px-6 py-4">
                  Created
                </th>
                <th scope="col" className="px-6 py-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {records.map((link) => (
                <tr key={link.slug} className="text-sm text-slate-700 dark:text-slate-200">
                  <td className="px-6 py-4 font-semibold">/{link.slug}</td>
                  <td className="px-6 py-4">
                    <span className="line-clamp-1" title={link.original_url}>
                      {link.original_url}
                    </span>
                  </td>
                  <td className="px-6 py-4">{link.clicks}</td>
                  <td className="px-6 py-4">{new Date(link.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => handleCopy(link.shortUrl)} aria-label={`Copy ${link.shortUrl}`}>
                        Copy
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => window.open(link.shortUrl, '_blank', 'noopener')}
                        aria-label={`Open ${link.shortUrl}`}
                      >
                        Open
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const dataUrl = await generateQr(link.slug);
                          const linkEl = document.createElement('a');
                          linkEl.href = dataUrl;
                          linkEl.download = `qr-${link.slug}.png`;
                          document.body.appendChild(linkEl);
                          linkEl.click();
                          linkEl.remove();
                        }}
                        aria-label={`Download QR for ${link.slug}`}
                      >
                        QR
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={() => handleDelete(link.slug)}
                        aria-label={`Delete ${link.slug}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 sm:hidden">
          {records.map((link) => (
            <LinkRow key={link.slug} link={link} onCopy={handleCopy} onDelete={handleDelete} qrGenerator={generateQr} />
          ))}
        </div>

        {records.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            You haven&apos;t created any links yet.{' '}
            <Link href="/" className="text-primary-600 dark:text-primary-400">
              Start by shortening your first URL.
            </Link>
          </div>
        )}

        {status && (
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400" role="status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
