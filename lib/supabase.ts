import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types';

const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!supabasePublicUrl || !supabasePublicAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient<Database>(supabasePublicUrl, supabasePublicAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export function createServerSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseServiceUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(supabaseServiceUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
