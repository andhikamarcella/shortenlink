'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type LinkRow = {
  id: string
  slug: string
  url: string
  created_at: string
}

type SessionUser = {
  id: string
  email: string | null
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

const generateSlug = () => Math.random().toString(36).slice(2, 10)

const isModerator = (email: string | null | undefined) => email === 'andhikamarcella546@gmail.com'

export default function DashboardPage() {
  const router = useRouter()

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [links, setLinks] = useState<Array<LinkRow & { clicks: number }>>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const [newUrl, setNewUrl] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

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
      void fetchLinks(currentUser.id)
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
        void fetchLinks(nextUser.id)
      }
    })

    void loadSession()

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [fetchLinks, router])

  const fetchLinks = useCallback(
    async (userId: string) => {
      setLoadingLinks(true)
      setError(null)

      const { data: linkRows, error: linkError } = await supabaseBrowser
        .from('links')
        .select('id, slug, url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (linkError) {
        console.error('[dashboard] failed to load links:', linkError.message)
        setError('Failed to load your links.')
        setLinks([])
        setLoadingLinks(false)
        return
      }

      const rows = linkRows ?? []
      const slugs = rows.map((row) => row.slug)
      let clickCounts = new Map<string, number>()

      if (slugs.length > 0) {
        const { data: clickRows, error: clickError } = await supabaseBrowser
          .from('clicks')
          .select('slug')
          .in('slug', slugs)

        if (clickError) {
          console.error('[dashboard] failed to load click counts:', clickError.message)
          setError('Failed to load your links.')
          setLinks([])
          setLoadingLinks(false)
          return
        }

        clickCounts = (clickRows ?? []).reduce((map, row) => {
          const current = map.get(row.slug) ?? 0
          map.set(row.slug, current + 1)
          return map
        }, new Map<string, number>())
      }

      const enriched = rows.map((row) => ({
        ...row,
        clicks: clickCounts.get(row.slug) ?? 0,
      }))

      setLinks(enriched)
      setLoadingLinks(false)
    },
    []
  )

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!sessionUser) {
        router.replace('/auth')
        return
      }

      const destination = newUrl.trim()
      const providedSlug = customSlug.trim()

      if (!destination) {
        setCreationError('Please enter a destination URL.')
        return
      }

      setCreationError(null)
      setCreating(true)

      const slug = providedSlug || generateSlug()

      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          url: destination,
          user_id: sessionUser.id,
        }),
      })

      const body = await response.json().catch(() => ({ success: false, error: 'Unknown error' }))

      if (!response.ok || !body.success) {
        const message = body?.error ? String(body.error) : 'Failed to create short link.'
        setCreationError(message)
        setCreating(false)
        return
      }

      setNewUrl('')
      setCustomSlug('')
      setCreating(false)
      await fetchLinks(sessionUser.id)
    },
    [customSlug, fetchLinks, newUrl, router, sessionUser]
  )

  const handleCopy = useCallback(async (slug: string) => {
    try {
      await navigator.clipboard.writeText(buildShortUrl(slug))
      setCopiedSlug(slug)
      window.setTimeout(() => {
        setCopiedSlug((current) => (current === slug ? null : current))
      }, 1500)
    } catch (error) {
      console.error('[dashboard] failed to copy short link:', error)
    }
  }, [])

  const handleDelete = useCallback(
    async (link: LinkRow & { clicks: number }) => {
      if (!sessionUser) {
        router.replace('/auth')
        return
      }

      const confirmation = window.confirm('Are you sure you want to delete this short link?')
      if (!confirmation) {
        return
      }

      const { error: deleteError } = await supabaseBrowser.from('links').delete().eq('id', link.id)

      if (deleteError) {
        console.error('[dashboard] failed to delete link:', deleteError.message)
        setError('Failed to delete the selected link.')
        return
      }

      // attempt to clean up click records (best effort)
      const { error: clicksError } = await supabaseBrowser.from('clicks').delete().eq('slug', link.slug)
      if (clicksError) {
        console.warn('[dashboard] failed to delete click records:', clicksError.message)
      }

      await fetchLinks(sessionUser.id)
    },
    [fetchLinks, router, sessionUser]
  )

  useEffect(() => {
    if (sessionUser) {
      // TODO: if isModerator(sessionUser.email) render feedback/chat moderation panel here
    }
  }, [sessionUser])

  const totalLinks = links.length

  const linkRows = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        shortUrl: buildShortUrl(link.slug),
      })),
    [links]
  )

  const isLoading = loadingSession || loadingLinks

  return (
    <div className="min-h-screen bg-[#0d1326] text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Your links</h1>
              <p className="text-sm text-white/60">Manage the URLs you have shortened with shortly.</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-fit rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Create new link
            </button>
          </div>

          <form
            onSubmit={handleCreate}
            className="mb-8 space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/90 backdrop-blur-sm"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">Quick create</h2>
              <p className="text-xs text-white/60">Add a new short link without leaving your dashboard.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-white/80" htmlFor="new-url">
                  Destination URL
                </label>
                <input
                  id="new-url"
                  type="url"
                  value={newUrl}
                  onChange={(event) => setNewUrl(event.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-white/80" htmlFor="custom-slug">
                  Custom slug (optional)
                </label>
                <input
                  id="custom-slug"
                  type="text"
                  value={customSlug}
                  onChange={(event) => setCustomSlug(event.target.value)}
                  placeholder="your-custom-slug"
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400"
                />
              </div>
            </div>
            {creationError && <p className="text-xs text-red-400">{creationError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Shorten URL'}
            </button>
          </form>

          {isLoading && <p className="text-sm text-white/50">Loading your links...</p>}

          {!isLoading && error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!isLoading && !error && totalLinks === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60 backdrop-blur-sm">
              You haven&apos;t created any links yet.
            </div>
          )}

          {!isLoading && !error && totalLinks > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 text-sm text-white/90 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-white/50">
                      <th className="px-4 py-3">Short URL</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Clicks</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {linkRows.map((link) => (
                      <tr key={link.id} className="align-top">
                        <td className="px-4 py-3">
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-indigo-300 hover:text-indigo-200 hover:underline"
                          >
                            {link.shortUrl}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="break-all text-white/70">{link.url}</span>
                        </td>
                        <td className="px-4 py-3 text-white/80">{link.clicks}</td>
                        <td className="px-4 py-3 text-white/60">{formatTimestamp(link.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => handleCopy(link.slug)}
                              className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                            >
                              {copiedSlug === link.slug ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              onClick={() => window.open(link.shortUrl, '_blank', 'noopener')}
                              className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => handleDelete(link)}
                              className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/30"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="mt-12 text-right text-xs text-white/40">shortly · version 1.0 alpha</p>
        </section>
      </main>
    </div>
  )
}
