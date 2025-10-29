'use client'

import { useEffect, useState } from 'react'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type PublicLink = {
  slug: string
  url: string
  created_at: string
}

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

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
        setError(null)
      }

      setLoading(false)
    }

    void loadLinks()
  }, [])

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  return (
    <div className="min-h-screen bg-[#0d1326] text-white">
      <Navbar />
      <main className="px-4">
        <section className="mx-auto max-w-3xl py-10">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-white">Explore</h1>
            <p className="mt-2 text-sm text-white/60">
              Recently created links from the shortly community.
            </p>
          </header>

          {loading && (
            <p className="text-sm text-white/60">Loading public links...</p>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && links.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No public links yet.
            </div>
          )}

          {!loading && !error && links.length > 0 && (
            <ul className="space-y-4">
              {links.map((link) => {
                const shortUrl = baseUrl ? `${baseUrl}/${link.slug}` : `/${link.slug}`
                return (
                  <li
                    key={link.slug}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-base text-indigo-300 transition hover:text-indigo-200 hover:underline"
                      >
                        {shortUrl}
                      </a>
                      <p className="mt-1 break-all text-xs text-white/70 md:text-sm">{link.url}</p>
                    </div>
                    <span className="text-xs text-white/40 md:text-right">
                      {formatTimestamp(link.created_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
