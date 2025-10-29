import { createClient } from '@supabase/supabase-js';

type ServerClientOptions = {
  admin?: boolean;
};

export function getSupabaseServerClient(options: ServerClientOptions = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('[supabase] missing env NEXT_PUBLIC_SUPABASE_URL');
    return null;
  }

  if (options.admin) {
    if (!serviceRole) {
      console.warn('[supabase] service role key not available, falling back to anon key');
    } else {
      return createClient(url, serviceRole, {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            'x-client-info': 'shortly-admin',
          },
        },
      });
    }
  }

  if (!anon) {
    console.error('[supabase] missing env NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  return createClient(url, anon, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'shortly-server',
      },
    },
  });
}
