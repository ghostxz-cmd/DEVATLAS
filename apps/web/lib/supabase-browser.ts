import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;

// Public values (URL + anon key) are safe for client usage and prevent
// hosting misconfiguration from breaking sign-in flows.
const FALLBACK_SUPABASE_URL = "https://iamlprhjtsouxlwjzqjl.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbWxwcmhqdHNvdXhsd2p6cWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTI1NjAsImV4cCI6MjA4OTM4ODU2MH0.1vzMkmPoG081RiHUFFc2atHy6u4-kTyIyqtKDLDX_24";

function getRuntimePublicEnv() {
  if (typeof window === "undefined") {
    return null;
  }

  return ((window as unknown as { __DEVATLAS_PUBLIC_ENV__?: { SUPABASE_URL?: string | null; SUPABASE_ANON_KEY?: string | null } }).__DEVATLAS_PUBLIC_ENV__ ?? null);
}

export function getSupabaseBrowserClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const runtimeEnv = getRuntimePublicEnv();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
    runtimeEnv?.SUPABASE_URL ??
    FALLBACK_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    runtimeEnv?.SUPABASE_ANON_KEY ??
    FALLBACK_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_ANON_KEY on the server.");
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}
