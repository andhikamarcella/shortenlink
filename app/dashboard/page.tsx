'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type LinkRow = {
  slug: string
  url: string
  created_at: string
  clicks?: number | null
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

export default function DashboardPage() {
  const router = useRouter()
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession()
      setLoadingSession(false)

      if (sessionError || !sessionData?.session) {
        setLoadingLinks(false)
        router.replace('/auth')
        return
      }

      const userId = sessionData.session.user.id
      const { data, error } = await supabaseBrowser
        .from('links')
        .select('slug, url, created_at, clicks')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[dashboard] failed to load links:', error.message)
        setError('Failed to load your links.')
        setLinks([])
      } else {
        setLinks(data ?? [])
        setError(null)
      }

      setLoadingLinks(false)
    }

    void load()
  }, [router])

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const isLoading = loadingSession || loadingLinks

  const handleCopy = async (slug: string) => {
    const shortUrl = baseUrl ? `${baseUrl}/${slug}` : `/${slug}`

    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopiedSlug(slug)
      window.setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 1500)
    } catch (copyError) {
      console.error('[dashboard] failed to copy slug:', copyError)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1326] text-white">
      <Navbar />
      <main className="px-4">
        <section className="mx-auto max-w-3xl py-10">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Your links</h1>
              <p className="mt-2 text-sm text-white/60">
                Manage the URLs you have shortened with shortly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Create new link
            </button>
          </div>

          {isLoading && <p className="text-sm text-white/60">Loading your links...</p>}

          {!isLoading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!isLoading && !error && links.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              You haven&apos;t created any links yet.
            </div>
          )}

          {!isLoading && !error && links.length > 0 && (
            <ul className="space-y-4">
              {links.map((link) => {
                const shortUrl = baseUrl ? `${baseUrl}/${link.slug}` : `/${link.slug}`
                const isCopied = copiedSlug === link.slug
                const clickCount = typeof link.clicks === 'number' ? link.clicks : 0

                return (
                  <li
                    key={link.slug}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-lg text-indigo-300 transition hover:text-indigo-200 hover:underline"
                      >
                        {shortUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(link.slug)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
                      >
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-2 break-all text-xs text-white/70 md:text-sm">{link.url}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/40 md:text-xs">
                      <span>Created: {formatTimestamp(link.created_at)}</span>
                      <span>Clicks: {clickCount}</span>
                    </div>
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
