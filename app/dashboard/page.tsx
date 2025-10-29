import DashboardClient from './dashboard-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabaseClientServer';

interface DashboardLink {
  slug: string;
  original_url: string;
  clicks: number;
  created_at: string;
}

function getProjectRef(): string | null {
  const source = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!source) {
    return null;
  }

  try {
    const host = new URL(source).hostname;
    const [ref] = host.split('.');
    return ref || null;
  } catch {
    return null;
  }
}

function extractAccessTokenFromCookies(store: ReturnType<typeof cookies>): string | null {
  const direct = store.get('sb-access-token')?.value;
  if (direct) {
    return direct;
  }

  const projectRef = getProjectRef();
  if (!projectRef) {
    return null;
  }

  const prefixedAccess = store.get(`sb-${projectRef}-access-token`)?.value;
  if (prefixedAccess) {
    return prefixedAccess;
  }

  const authCookie = store.get(`sb-${projectRef}-auth-token`)?.value;
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie) as {
        access_token?: string;
        currentSession?: { access_token?: string } | null;
      };
      return parsed.access_token ?? parsed.currentSession?.access_token ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const accessToken = extractAccessTokenFromCookies(cookieStore);

  if (!accessToken) {
    redirect('/auth');
  }

  const supabase = getSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    redirect('/auth');
  }

  const user = userData.user;

  const { data, error } = await supabase
    .from('links')
    .select('slug, original_url, clicks, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const safeLinks: DashboardLink[] = !error && data
    ? data.map((link) => ({
        slug: link.slug,
        original_url: link.original_url,
        clicks: link.clicks ?? 0,
        created_at: link.created_at,
      }))
    : [];

  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    vercelUrl ??
    'https://shortenlink-snowy.vercel.app';
  const normalizedBase = baseUrl.replace(/\/$/, '');

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <DashboardClient
        initialLinks={safeLinks}
        shortBase={normalizedBase}
        userEmail={user.email ?? 'your account'}
      />
    </section>
  );
}
