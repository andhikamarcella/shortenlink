'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type SessionUser = {
  id: string
  email: string | null
}

type LinkRow = {
  slug: string
  url: string
  created_at: string
}

type ClickRow = {
  slug: string
  country: string | null
}

type LinkStat = LinkRow & { clicks: number }

type CountryStat = {
  country: string
  count: number
  percentage: number
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

const shortBase = process.env.NEXT_PUBLIC_BASE_URL ?? ''

const buildShortUrl = (slug: string) => {
  if (shortBase) return `${shortBase}/${slug}`
  if (typeof window !== 'undefined') return `${window.location.origin}/${slug}`
  return `/${slug}`
}

const isModerator = (email: string | null | undefined) => email === 'andhikamarcella546@gmail.com'

export default function AnalyticsPage() {
  const router = useRouter()

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkStats, setLinkStats] = useState<LinkStat[]>([])
  const [countryStats, setCountryStats] = useState<CountryStat[]>([])
  const [totalClicks, setTotalClicks] = useState(0)

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      setLoadingSession(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!isMounted) return

      setLoadingSession(false)

      if (error || !data?.session) {
        router.replace('/auth')
        return
      }

      const currentUser: SessionUser = {
        id: data.session.user.id,
        email: data.session.user.email ?? null,
      }

      setSessionUser(currentUser)
      void fetchAnalytics(currentUser.id)
    }

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((event, data) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') {
        setSessionUser(null)
        router.replace('/auth')
        return
      }

      if (data?.user) {
        const nextUser: SessionUser = {
          id: data.user.id,
          email: data.user.email ?? null,
        }
        setSessionUser(nextUser)
        void fetchAnalytics(nextUser.id)
      }
    })

    void loadSession()

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [router])

  const fetchAnalytics = async (userId: string) => {
    setLoadingAnalytics(true)
    setError(null)

    const { data: linkRows, error: linkError } = await supabaseBrowser
      .from('links')
      .select('slug, url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (linkError) {
      console.error('[analytics] failed to load links:', linkError.message)
      setError('Failed to load analytics.')
      setLinkStats([])
      setCountryStats([])
      setTotalClicks(0)
      setLoadingAnalytics(false)
      return
    }

    const links = linkRows ?? []
    const slugs = links.map((link) => link.slug)

    if (slugs.length === 0) {
      setLinkStats([])
      setCountryStats([])
      setTotalClicks(0)
      setLoadingAnalytics(false)
      return
    }

    const { data: clickRows, error: clickError } = await supabaseBrowser
      .from('clicks')
      .select('slug, country')
      .in('slug', slugs)

    if (clickError) {
      console.error('[analytics] failed to load clicks:', clickError.message)
      setError('Failed to load analytics.')
      setLinkStats([])
      setCountryStats([])
      setTotalClicks(0)
      setLoadingAnalytics(false)
      return
    }

    const clicks = (clickRows ?? []) as ClickRow[]
    const total = clicks.length

    const slugMap = new Map<string, number>()
    const countryMap = new Map<string, number>()

    clicks.forEach((row) => {
      const slug = row.slug
      const country = row.country ?? 'Unknown'

      slugMap.set(slug, (slugMap.get(slug) ?? 0) + 1)
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1)
    })

    const linkStatsData: LinkStat[] = links
      .map((link) => ({
        ...link,
        clicks: slugMap.get(link.slug) ?? 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)

    const countryStatsData: CountryStat[] = Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    setLinkStats(linkStatsData)
    setCountryStats(countryStatsData)
    setTotalClicks(total)
    setLoadingAnalytics(false)
  }

  useEffect(() => {
    if (sessionUser) {
      // TODO: if isModerator(sessionUser.email) render feedback/chat moderation panel here
    }
  }, [sessionUser])

  const isLoading = loadingSession || loadingAnalytics

  const totalLinks = linkStats.length

  const hasCountryData = useMemo(() => countryStats.some((item) => item.count > 0), [countryStats])

  return (
    <div className="min-h-screen bg-[#0d1326] text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-white">Analytics</h1>
            <p className="text-sm text-white/60">Traffic insights for your short links.</p>
          </div>

          {isLoading && <p className="text-sm text-white/50">Loading analytics...</p>}

          {!isLoading && error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!isLoading && !error && totalLinks === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60 backdrop-blur-sm">
              No data yet. Create a link and start getting clicks.
            </div>
          )}

          {!isLoading && !error && totalLinks > 0 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/90 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-white">Traffic overview</h2>
                <p className="text-sm text-white/60">Total clicks across your links</p>
                <p className="mt-4 text-4xl font-semibold text-white">{totalClicks}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/90 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-white">Top links</h2>
                <p className="text-sm text-white/60">Your links ranked by total clicks.</p>
                <div className="mt-4 space-y-4">
                  {linkStats.map((link) => (
                    <div key={link.slug} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <a
                            href={buildShortUrl(link.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-indigo-300 hover:text-indigo-200 hover:underline"
                          >
                            {buildShortUrl(link.slug)}
                          </a>
                          <p className="mt-1 break-all text-xs text-white/60 md:text-sm">{link.url}</p>
                        </div>
                        <div className="text-right text-sm text-white/70">
                          <p className="text-lg font-semibold text-white">{link.clicks}</p>
                          <span className="text-xs text-white/50">clicks</span>
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-white/40 md:text-xs">
                        Created: {formatTimestamp(link.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/90 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-white">By country</h2>
                <p className="text-sm text-white/60">Where your clicks are coming from.</p>
                <div className="mt-4 space-y-3">
                  {!hasCountryData && (
                    <p className="text-sm text-white/50">No geo data yet.</p>
                  )}
                  {hasCountryData &&
                    countryStats.map((country) => (
                      <div key={country.country} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span className="font-medium text-white/90">{country.country}</span>
                          <span>{country.percentage}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-indigo-500"
                            style={{ width: `${country.percentage > 0 ? Math.max(country.percentage, 4) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <p className="mt-12 text-right text-xs text-white/40">shortly · version 1.0 alpha</p>
        </section>
      </main>
    </div>
  )
}
