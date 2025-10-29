'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGoogleSignIn() {
    setAuthError(null);
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      router.push('/dashboard');
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-900 text-white px-4">
      <div className="w-full max-w-sm rounded-xl bg-neutral-800 p-6 shadow-lg ring-1 ring-white/10">
        <h1 className="text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-400">Use Google to access your dashboard.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending}
          className={[
            'mt-6 w-full rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          {isPending ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {authError ? (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {authError}
          </p>
        ) : null}

        <p className="mt-8 text-[10px] leading-relaxed text-neutral-500 text-center">
          By continuing you agree to sign in with Google via Supabase.
        </p>
      </div>
    </main>
  );
}
