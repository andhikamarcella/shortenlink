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

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLinks = async () => {
      const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession()

      if (sessionError || !sessionData?.session) {
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
      } else {
        setLinks(data ?? [])
      }

      setLoading(false)
    }

    void loadLinks()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex h-[calc(100vh-72px)] items-center justify-center">
          <p>Loading dashboard...</p>
        </div>
      </main>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Your links</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Manage the URLs you have shortened with shortly.
        </p>

        {error && (
          <div className="mt-6 rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!error && links.length === 0 && (
          <div className="mt-6 rounded border border-white/10 bg-white/5 p-6 text-sm text-neutral-300">
            You don&apos;t have any links yet.
          </div>
        )}

        {!error && links.length > 0 && (
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
                    Created {new Date(link.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 break-all text-neutral-200">{link.url}</p>
                {typeof link.clicks === 'number' && (
                  <p className="mt-2 text-xs text-neutral-400">
                    Clicks: <span className="font-semibold text-white">{link.clicks}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
