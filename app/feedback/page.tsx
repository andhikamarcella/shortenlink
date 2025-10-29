'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { supabaseBrowser } from '@/lib/supabaseClientBrowser'

type FeedbackRow = {
  id: string
  user_id: string | null
  email: string | null
  message: string
  created_at: string
}

type FeedbackSession = {
  user: {
    id: string
    email: string | null
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

const isModerator = (email: string | null) =>
  email ? ['andhikamarcella546@gmail.com'].includes(email) : false

export default function FeedbackPage() {
  const router = useRouter()
  const isMountedRef = useRef(true)

  const [session, setSession] = useState<FeedbackSession | null>(null)
  const [modView, setModView] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [messages, setMessages] = useState<FeedbackRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    isMountedRef.current = true

    const load = async () => {
      setLoadingSession(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!isMountedRef.current) return

      setLoadingSession(false)

      if (error || !data?.session) {
        setSession(null)
        setLoadingMessages(false)
        router.replace('/auth')
        return
      }

      const currentSession: FeedbackSession = {
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        },
      }

      setSession(currentSession)
      const moderator = isModerator(currentSession.user.email)
      setModView(moderator)
      void fetchMessages(currentSession.user.id, moderator)
    }

    void load()

    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const fetchMessages = async (userId: string, moderator: boolean) => {
    setLoadingMessages(true)
    setError(null)

    let query = supabaseBrowser
      .from('feedback')
      .select('id, user_id, email, message, created_at')
      .order('created_at', { ascending: false })

    if (!moderator) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (!isMountedRef.current) return

    if (error) {
      console.error('[feedback] failed to load messages:', error.message)
      setError('Failed to load feedback.')
      setMessages([])
    } else {
      setError(null)
      setMessages(data ?? [])
    }

    setLoadingMessages(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!session) {
      router.replace('/auth')
      return
    }

    const trimmed = messageText.trim()
    if (trimmed.length === 0) {
      return
    }

    setSending(true)

    const { error } = await supabaseBrowser.from('feedback').insert({
      user_id: session.user.id,
      email: session.user.email,
      message: trimmed,
    })

    if (error) {
      console.error('[feedback] failed to submit message:', error.message)
      setSending(false)
      return
    }

    setMessageText('')
    setSending(false)
    void fetchMessages(session.user.id, modView)
  }

  const isLoading = loadingSession || loadingMessages
  const hasSession = !!session

  return (
    <div className="bg-[#0d1326] min-h-screen text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-3xl py-10 px-4">
          <header className="mb-8">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="flex items-center text-2xl font-semibold text-white">
                Feedback
                {modView && (
                  <span className="ml-2 rounded-md border border-pink-500/40 bg-pink-600/30 px-2 py-1 text-[10px] font-medium text-pink-300">
                    MOD VIEW
                  </span>
                )}
              </h1>
              {!hasSession && !isLoading && (
                <span className="text-xs text-white/50">Redirecting to sign in…</span>
              )}
            </div>
            <p className="text-sm text-white/60">Send us bugs, ideas, and suggestions. Thank you 💜</p>
          </header>

          {isLoading ? (
            <p className="mb-6 text-sm text-white/50">Loading feedback...</p>
          ) : error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
          ) : (
            <>
              <div className="mb-6 flex max-h-[400px] flex-col gap-4 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 backdrop-blur-sm">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/50">No messages yet.</p>
                ) : (
                  messages.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-white/10 bg-white/10 p-3 text-white/90 backdrop-blur-sm"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-xs font-medium text-white">
                          {modView ? row.email ?? 'unknown' : row.email ?? 'you'}
                        </span>
                        <span className="text-[10px] text-white/40">{formatTimestamp(row.created_at)}</span>
                      </div>
                      <div className="whitespace-pre-line break-words text-sm text-white/90">{row.message}</div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <label className="text-sm font-medium text-white/80" htmlFor="feedback-message">
                  Your message
                </label>
                <textarea
                  id="feedback-message"
                  className="w-full rounded-md border border-white/20 bg-black/40 p-2 text-sm text-white outline-none focus:border-indigo-500"
                  placeholder="Tell us what’s broken, what you love, or what feature you want next..."
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  required
                  disabled={sending}
                  minLength={1}
                />
                <button
                  type="submit"
                  disabled={sending || messageText.trim().length === 0}
                  className="w-fit rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
