'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type AnalyticsRow = {
  slug: string
  url: string
  clicks?: number | null
  country_stats?: Record<string, number> | string | null
}

type SupabaseSession = {
  user: {
    id: string
  }
}

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

const renderGeo = (countryStats: Record<string, number>) => {
  const entries = Object.entries(countryStats).filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
  if (entries.length === 0) {
    return <p className="text-white/50 text-xs">No geo data yet.</p>
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!total) {
    return <p className="text-white/50 text-xs">No geo data yet.</p>
  }

  return (
    <ul className="flex flex-wrap gap-3 text-[11px] text-white/70 md:text-xs">
      {entries.map(([country, value]) => {
        const percentage = Math.round((value / total) * 100)
        return (
          <li key={country} className="flex items-center gap-1">
            <span className="font-medium text-white/90">{country}:</span>
            <span className="text-white/60">{percentage}%</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [session, setSession] = useState<SupabaseSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingData, setLoadingData] = useState(true)
  const [rows, setRows] = useState<AnalyticsRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoadingSession(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!isMounted) return

      setLoadingSession(false)

      if (error || !data?.session) {
        setSession(null)
        setLoadingData(false)
        router.replace('/auth')
        return
      }

      const currentSession: SupabaseSession = {
        user: { id: data.session.user.id },
      }

      setSession(currentSession)
      setLoadingData(true)

      const { data: analyticsData, error: analyticsError } = await supabaseBrowser
        .from('links')
        .select('slug, url, clicks, country_stats')
        .eq('user_id', data.session.user.id)
        .order('clicks', { ascending: false })

      if (!isMounted) return

      if (analyticsError) {
        console.error('[analytics] failed to load analytics:', analyticsError.message)
        setError('Failed to load analytics.')
        setRows([])
      } else {
        setError(null)
        setRows(analyticsData ?? [])
      }

      setLoadingData(false)
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [router])

  const isLoading = loadingSession || loadingData
  const hasSession = !!session

  return (
    <div className="bg-[#0d1326] min-h-screen text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-3xl py-10 px-4">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-white">Analytics</h1>
            <p className="text-sm text-white/60">Traffic insights for your short links.</p>
          </header>

          {isLoading && <p className="text-sm text-white/50">Loading analytics...</p>}

          {!hasSession && !isLoading && (
            <p className="text-sm text-white/50">Redirecting to sign in…</p>
          )}

          {!isLoading && error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && rows.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
              No data yet. Create a link and start getting clicks.
            </div>
          )}

          {!isLoading && !error &&
            rows.map((row) => {
              const shortUrl = buildShortUrl(row.slug)
              const clicks = typeof row.clicks === 'number' ? row.clicks : 0

              let stats: Record<string, number> = {}
              if (row.country_stats) {
                if (typeof row.country_stats === 'string') {
                  try {
                    stats = JSON.parse(row.country_stats)
                  } catch (parseError) {
                    console.error('[analytics] failed to parse country stats:', parseError)
                  }
                } else {
                  stats = row.country_stats
                }
              }

              return (
                <div
                  key={row.slug}
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
                    <span className="self-start rounded-md border border-indigo-500/40 bg-indigo-600/20 px-2 py-1 text-xs font-medium text-indigo-300">
                      {clicks} clicks
                    </span>
                  </div>

                  <div className="mt-2 break-all text-xs text-white/70 md:text-sm">{row.url}</div>

                  <div className="mt-3">
                    <p className="mb-1 text-[11px] text-white/50 md:text-xs">Geo breakdown</p>
                    {renderGeo(stats)}
                  </div>
                </div>
              )
            })}
        </section>
      </main>
    </div>
  )
}
