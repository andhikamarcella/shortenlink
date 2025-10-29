import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';
import { DashboardClient } from './dashboard-client';
import { LoginForm } from './login-form';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center px-4 py-16">
        <LoginForm />
      </section>
    );
  }

  const admin = createServiceSupabaseClient();
  const { data: links } = await admin
    .from('links')
    .select('slug, original_url, clicks, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <DashboardClient initialLinks={links ?? []} shortBase={origin.replace(/\/$/, '')} userEmail={session.user.email ?? 'you'} />
    </section>
  );
}
