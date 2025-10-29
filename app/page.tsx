'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { isValidHttpUrl, sanitizeUrl } from '@/lib/validateUrl';
import { slugPattern } from '@/lib/slug';
import QRCode from 'qrcode';
import { supabaseClient } from '@/lib/supabaseClient';

interface ShortenResponse {
  shortUrl: string;
  slug: string;
}

interface SlugAvailabilityResult {
  available: boolean;
  error?: string;
}

const checkSlugAvailability = async (slug: string): Promise<SlugAvailabilityResult> => {
  if (!slug) {
    return { available: true };
  }

  const response = await fetch(`/api/check-slug?slug=${encodeURIComponent(slug)}`);
  let body: { available?: boolean; error?: string } = {};

  try {
    body = (await response.json()) as { available?: boolean; error?: string };
  } catch {
    body = {};
  }

  if (!response.ok) {
    return { available: false, error: body.error || 'Unable to check slug availability right now.' };
  }

  return {
    available: Boolean(body.available),
    error: body.error,
  };
};

export default function HomePage() {
  const supabase = supabaseClient;
  const [originalUrl, setOriginalUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugCheckError, setSlugCheckError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!customSlug) {
      setSlugError(null);
      setSlugAvailable(null);
      setSlugCheckError(false);
      setIsCheckingSlug(false);
      return;
    }

    if (!slugPattern.test(customSlug)) {
      setSlugError('Custom slug may only contain letters, numbers, or hyphens (max 24 characters).');
      setSlugAvailable(null);
      setSlugCheckError(false);
      setIsCheckingSlug(false);
      return;
    }

    setSlugError(null);
    setSlugCheckError(false);
    setIsCheckingSlug(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(customSlug);
        if (result.error) {
          setSlugCheckError(true);
          setSlugAvailable(null);
          return;
        }

        setSlugCheckError(false);
        setSlugAvailable(result.available);
        if (!result.available) {
          setSlugError('This slug is already taken. Try another one.');
        }
      } catch {
        setSlugCheckError(true);
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);
  }, [customSlug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setStatusMessage('');

    const sanitizedUrl = sanitizeUrl(originalUrl);
    if (!isValidHttpUrl(sanitizedUrl)) {
      setUrlError('Please enter a valid URL that starts with http:// or https://.');
      return;
    }

    if (customSlug && (!slugPattern.test(customSlug) || slugAvailable === false)) {
      setSlugError('This slug is not available.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_url: sanitizedUrl,
          custom_slug: customSlug || undefined,
          is_public: true,
          user_id: userId ?? undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to shorten URL');
      }

      const data = (await response.json()) as ShortenResponse;
      setResult(data);
      setStatusMessage('Success! Your link is ready.');
      const qr = await QRCode.toDataURL(data.shortUrl, { margin: 2, width: 256 });
      setQrDataUrl(qr);
      setTimeout(() => resultRef.current?.focus(), 50);
    } catch (error: any) {
      setStatusMessage(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setStatusMessage('Short URL copied to clipboard.');
  };

  const handleOpen = () => {
    if (!result) return;
    window.open(result.shortUrl, '_blank', 'noopener');
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-4 py-16">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Short links that scale with you
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Create branded, trackable short URLs in seconds. shortly is fast, accessible, and ready for production.
        </p>
      </div>

      <form
        className="w-full max-w-3xl space-y-6 rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/90 dark:ring-slate-800"
        onSubmit={handleSubmit}
        aria-busy={isLoading}
      >
        <div>
          <label htmlFor="original-url" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Destination URL
          </label>
          <Input
            id="original-url"
            name="original_url"
            required
            type="url"
            placeholder="https://example.com/your-page"
            autoComplete="off"
            value={originalUrl}
            onChange={(event) => setOriginalUrl(event.target.value)}
            error={urlError || undefined}
            hint="Paste any secure URL (http or https)."
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="custom-slug" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Custom slug (optional)
            </label>
            {isCheckingSlug && (
              <span role="status" aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
                Checking availability…
              </span>
            )}
          </div>
          <Input
            id="custom-slug"
            name="custom_slug"
            type="text"
            maxLength={24}
            pattern="[A-Za-z0-9-]+"
            placeholder="your-brand"
            autoComplete="off"
            value={customSlug}
            onChange={(event) => setCustomSlug(event.target.value)}
            error={slugError || undefined}
            hint="Use letters, numbers, or hyphens."
          />
          {slugAvailable && !slugError && customSlug && !slugCheckError && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400" role="status">
              ✅ Available
            </p>
          )}
          {slugAvailable === false && !slugCheckError && customSlug && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="status">
              ❌ Taken
            </p>
          )}
          {slugCheckError && !slugError && customSlug && (
            <p className="mt-1 text-sm text-amber-500 dark:text-amber-400" role="status">
              ⚠️ Error checking slug
            </p>
          )}
        </div>
        <Button type="submit" disabled={isLoading} className="w-full justify-center text-base">
          {isLoading ? 'Shortening…' : 'Shorten URL'}
        </Button>
        {statusMessage && (
          <p role="status" aria-live="polite" className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            {statusMessage}
          </p>
        )}
      </form>

      {result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="w-full max-w-3xl space-y-4 rounded-3xl border border-primary-200 bg-white/90 p-8 shadow-xl outline-none transition dark:border-primary-500/40 dark:bg-slate-900/90"
        >
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Your short link</h2>
            <p className="text-lg font-mono text-primary-600 dark:text-primary-400">{result.shortUrl}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={handleCopy} aria-label="Copy short URL">
              Copy
            </Button>
            <Button variant="secondary" onClick={handleOpen} aria-label="Open short URL">
              Open
            </Button>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`qr-${result.slug}.png`}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-500/20 dark:text-primary-200"
              >
                Download QR
              </a>
            )}
          </div>
          {qrDataUrl && (
            <div className="flex justify-center">
              <img
                src={qrDataUrl}
                alt={`QR code for ${result.shortUrl}`}
                className="h-40 w-40 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
