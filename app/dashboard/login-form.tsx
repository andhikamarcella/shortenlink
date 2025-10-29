'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export function LoginForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setStatus(error.message || 'Failed to send magic link.');
    } else {
      setStatus('Check your email for a magic link to sign in.');
    }
    setIsLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      aria-busy={isLoading}
    >
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Sign in to shortly</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Enter your email and we&apos;ll send you a secure magic link.
        </p>
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full justify-center text-base">
        {isLoading ? 'Sending…' : 'Send magic link'}
      </Button>
      {status && (
        <p role="status" aria-live="polite" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {status}
        </p>
      )}
    </form>
  );
}
