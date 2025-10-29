import DashboardClient from './dashboard-client';
import { createClient } from '@supabase/supabase-js';
import { ReactElement } from 'react';

interface DashboardLink {
  slug: string;
  original_url: string;
  clicks: number;
  created_at: string;
}

export default async function DashboardPage(): Promise<ReactElement> {
  const session = {
    user: {
      id: 'mock-user-id',
      email: 'user@example.com',
    },
  };

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: { persistSession: false },
    }
  );

  const { data, error } = await supabase
    .from('links')
    .select('slug, original_url, clicks, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const safeLinks: DashboardLink[] = error || !data
    ? []
    : data.map((link) => ({
        slug: link.slug,
        original_url: link.original_url,
        clicks: link.clicks ?? 0,
        created_at: link.created_at,
      }));

  const origin = process.env.NEXT_PUBLIC_BASE_URL || '';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <DashboardClient
        initialLinks={safeLinks}
        shortBase={origin.replace(/\/$/, '')}
        userEmail={session.user.email ?? 'you'}
      />
    </section>
  );
}
