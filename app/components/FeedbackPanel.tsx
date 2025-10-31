'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { moderatorEmails } from '@/lib/isModerator';
import { createSupabaseBrowserClient } from '@/lib/supabaseClientBrowser';

type FeedbackMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  email: string | null;
};

type FeedbackPanelProps = {
  userId: string;
  email: string | null;
};

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function FeedbackPanel({ userId, email }: FeedbackPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isModerator = moderatorEmails.includes((email ?? '').toLowerCase());

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('feedback')
      .select('id, user_id, message, created_at, email')
      .order('created_at', { ascending: false });

    if (!isModerator) {
      query = query.eq('user_id', userId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('[feedback] failed to load messages', fetchError.message);
      setError('Unable to load feedback right now.');
      setMessages([]);
      setLoading(false);
      return;
    }

    setMessages(data ?? []);
    setLoading(false);
  }, [isModerator, supabase, userId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel('feedback-stream')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
        },
        (payload) => {
          const record = payload.new as FeedbackMessage;
          if (!isModerator && record.user_id !== userId) {
            return;
          }
          setMessages((prev) => [record, ...prev]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isModerator, supabase, userId]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!input.trim()) return;
      setSending(true);
      setError(null);

      const { error: insertError } = await supabase.from('feedback').insert({
        user_id: userId,
        email,
        message: input.trim(),
      });

      if (insertError) {
        console.error('[feedback] failed to send message', insertError.message);
        setError('Failed to send feedback. Please try again.');
        setSending(false);
        return;
      }

      setInput('');
      setSending(false);
    },
    [email, input, supabase, userId]
  );

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Feedback / Report a bug</h2>
        {isModerator && (
          <span className="rounded-full border border-indigo-500/50 bg-indigo-600/20 px-2 py-0.5 text-xs font-medium text-indigo-200">
            MOD
          </span>
        )}
      </div>
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 backdrop-blur">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading feedback…</p>
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet. Share your thoughts!</p>
        ) : (
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-2">
            {messages.map((message) => {
              const moderatorBubble = moderatorEmails.includes(
                (message.email ?? '').toLowerCase()
              );
              return (
                <div
                  key={message.id}
                  className={clsx(
                    'rounded-xl border p-3 text-sm shadow-sm',
                    moderatorBubble
                      ? 'border-indigo-500/40 bg-indigo-600/20 text-indigo-100'
                      : 'border-zinc-800/60 bg-zinc-900/70 text-zinc-100'
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
                    <span>{message.email ?? 'you'}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{formatTimestamp(message.created_at)}</span>
                    {moderatorBubble && (
                      <span className="rounded border border-indigo-400/60 bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-100">
                        MOD
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                    {message.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4 backdrop-blur"
      >
        <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="feedback-input">
          Share your feedback
        </label>
        <textarea
          id="feedback-input"
          className="min-h-[96px] w-full rounded-lg border border-zinc-700/60 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
          placeholder="Tell us what’s working great, what’s broken, or what you’d love to see next…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={sending}
          required
        />
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          {error && <span className="text-rose-400">{error}</span>}
          <button
            type="submit"
            disabled={sending}
            className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}
