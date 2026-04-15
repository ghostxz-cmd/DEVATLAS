import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;

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
    undefined;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    runtimeEnv?.SUPABASE_ANON_KEY ??
    undefined;

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
