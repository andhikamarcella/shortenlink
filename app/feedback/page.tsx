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

const isModerator = (email: string | null | undefined) => email === 'andhikamarcella546@gmail.com'

export default function FeedbackPage() {
  const router = useRouter()
  const mountedRef = useRef(true)

  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [modView, setModView] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [messages, setMessages] = useState<FeedbackRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    mountedRef.current = true

    const loadSession = async () => {
      setLoadingSession(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (!mountedRef.current) return

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
      const moderator = isModerator(currentUser.email)
      setModView(moderator)
      void fetchMessages(currentUser.id, moderator)
    }

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((event, data) => {
      if (!mountedRef.current) return
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
        const moderator = isModerator(nextUser.email)
        setModView(moderator)
        void fetchMessages(nextUser.id, moderator)
      }
    })

    void loadSession()

    return () => {
      mountedRef.current = false
      authListener?.subscription.unsubscribe()
    }
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

    if (!mountedRef.current) return

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

    if (!sessionUser) {
      router.replace('/auth')
      return
    }

    const trimmed = messageText.trim()
    if (trimmed.length === 0) {
      return
    }

    setSending(true)

    const { error } = await supabaseBrowser.from('feedback').insert({
      user_id: sessionUser.id,
      email: sessionUser.email,
      message: trimmed,
    })

    if (error) {
      console.error('[feedback] failed to submit message:', error.message)
      setSending(false)
      return
    }

    setMessageText('')
    setSending(false)
    void fetchMessages(sessionUser.id, modView)
  }

  const isLoading = loadingSession || loadingMessages

  return (
    <div className="min-h-screen bg-[#0d1326] text-white">
      <Navbar />
      <main>
        <section className="mx-auto max-w-4xl px-4 py-16">
          <header className="mb-8">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="flex items-center text-3xl font-semibold text-white">
                Feedback
                {modView && (
                  <span className="ml-2 rounded-md border border-pink-500/40 bg-pink-600/30 px-2 py-1 text-[10px] font-medium text-pink-300">
                    MOD VIEW
                  </span>
                )}
              </h1>
            </div>
            <p className="text-sm text-white/60">Send us bugs, ideas, and suggestions. Thank you 💜</p>
          </header>

          {isLoading ? (
            <p className="mb-6 text-sm text-white/50">Loading feedback...</p>
          ) : error ? (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
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
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 backdrop-blur-sm"
              >
                <label className="text-sm font-medium text-white/80" htmlFor="feedback-message">
                  Your message
                </label>
                <textarea
                  id="feedback-message"
                  className="w-full rounded-md border border-white/20 bg-black/40 p-2 text-sm text-white outline-none transition focus:border-indigo-500"
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

          <p className="mt-12 text-right text-xs text-white/40">shortly · version 1.0 alpha</p>
        </section>
      </main>
    </div>
  )
}
