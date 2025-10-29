import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import type { Database } from './types';

export async function requireAuth() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    redirect('/auth');
  }

  return { session, user: session.user };
}
