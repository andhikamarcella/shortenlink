'use client'

import { useEffect, useState } from 'react'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type PublicLink = {
  slug: string
  url: string
  created_at: string
}

export default function ExplorePage() {
  const [links, setLinks] = useState<PublicLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLinks = async () => {
      const { data, error } = await supabaseBrowser
        .from('links')
        .select('slug, url, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('[explore] failed to load links:', error.message)
        setError('Unable to load public links right now.')
      } else {
        setLinks(data ?? [])
      }

      setLoading(false)
    }

    void loadLinks()
  }, [])

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Explore</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Recently created links from the shortly community.
        </p>

        {loading && (
          <div className="mt-6 text-sm text-neutral-400">Loading public links...</div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && links.length === 0 && (
          <div className="mt-6 rounded border border-white/10 bg-white/5 p-6 text-sm text-neutral-300">
            No public links yet.
          </div>
        )}

        {!loading && !error && links.length > 0 && (
          <ul className="mt-6 space-y-4">
            {links.map((link) => (
              <li
                key={link.slug}
                className="rounded border border-white/10 bg-white/5 p-4 text-sm text-neutral-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`${baseUrl}/${link.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-base text-purple-300 hover:underline"
                  >
                    {baseUrl ? `${baseUrl}/${link.slug}` : `/${link.slug}`}
                  </a>
                  <span className="text-xs text-neutral-400">
                    {new Date(link.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 break-all text-neutral-200">{link.url}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
