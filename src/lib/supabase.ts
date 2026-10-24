import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Trim trailing /rest/v1 or /rest/v1/ and trailing slashes if accidentally included
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl !== '' &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey &&
    supabaseAnonKey !== ''
  );
}

// Fallback dummy client if credentials are not configured yet, so the app remains 100% operational offline / as guest
let client: SupabaseClient;

if (isSupabaseConfigured()) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  // Safe mock client so builds and guest play do not throw
  client = createClient(
    'https://placeholder-domain-not-configured.supabase.co',
    'placeholder-anon-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

export const supabase = client;
