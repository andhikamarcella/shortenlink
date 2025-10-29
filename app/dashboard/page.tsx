'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type DashboardLink = {
  slug: string
  url: string
  created_at: string
  clicks?: number | null
}

type SupabaseSession = {
  user: {
    id: string
  }
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

const buildShortUrl = (slug: string) => {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (base && base.length > 0) {
    return `${base}/${slug}`
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/${slug}`
  }

  return `/${slug}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<SupabaseSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [links, setLinks] = useState<DashboardLink[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoadingSession(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!isMounted) return

      setLoadingSession(false)

      if (error || !data?.session) {
        setSession(null)
        setLoadingLinks(false)
        router.replace('/auth')
        return
      }

      const nextSession: SupabaseSession = {
        user: {
          id: data.session.user.id,
        },
      }

      setSession(nextSession)
      setLoadingLinks(true)

      const { data: linkData, error: linkError } = await supabaseBrowser
        .from('links')
        .select('slug, url, created_at, clicks')
        .eq('user_id', data.session.user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (linkError) {
        console.error('[dashboard] failed to load links:', linkError.message)
        setError('Failed to load your links.')
        setLinks([])
      } else {
        setError(null)
        setLinks(linkData ?? [])
      }

      setLoadingLinks(false)
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [router])

  const isLoading = loadingSession || loadingLinks
  const hasSession = !!session

  return (
    <div className="bg-[#0d1326] min-h-screen text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-3xl py-10 px-4">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Your links</h1>
              <p className="text-sm text-white/60">Manage and track your short URLs.</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-fit rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Create new link
            </button>
          </div>

          {isLoading && <p className="text-sm text-white/50">Loading your links...</p>}

          {!hasSession && !isLoading && (
            <p className="text-sm text-white/50">Redirecting to sign in…</p>
          )}

          {!isLoading && error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && links.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              You haven&apos;t created any links yet.
            </div>
          )}

          {!isLoading && !error &&
            links.map((link) => {
              const shortUrl = buildShortUrl(link.slug)
              const isCopied = copiedSlug === link.slug
              const clickCount = typeof link.clicks === 'number' ? link.clicks : 0

              return (
                <div
                  key={link.slug}
                  className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-base text-indigo-400 transition hover:text-indigo-300 hover:underline break-all"
                    >
                      {shortUrl}
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shortUrl)
                          setCopiedSlug(link.slug)
                          window.setTimeout(() => {
                            setCopiedSlug((current) => (current === link.slug ? null : current))
                          }, 1500)
                        } catch (copyError) {
                          console.error('[dashboard] failed to copy short url:', copyError)
                        }
                      }}
                      className="self-start rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  <div className="mt-2 break-all text-xs text-white/70 md:text-sm">{link.url}</div>

                  <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/40 md:text-xs">
                    <span>Created: {formatTimestamp(link.created_at)}</span>
                    <span>Clicks: {clickCount}</span>
                  </div>
                </div>
              )
            })}
        </section>
      </main>
    </div>
  )
}
