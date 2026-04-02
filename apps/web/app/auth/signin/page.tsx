"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SignInPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboad-administrator");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const nextParam = new URLSearchParams(window.location.search).get("next");
      if (nextParam) {
        setNextPath(nextParam);
      }
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(nextPath);
      }
    };

    void checkSession();
  }, [nextPath, router]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
    } catch (signInCatchError) {
      setError(signInCatchError instanceof Error ? signInCatchError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4">
      <section className="w-full max-w-md rounded-3xl border border-[#dadce0] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-[#202124]">Admin login</h1>
        <p className="mt-2 text-sm text-[#5f6368]">Autentificare pentru zona de administrare.</p>

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-[#3c4043]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-12 w-full rounded-xl border border-[#dadce0] px-4 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-[#3c4043]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="h-12 w-full rounded-xl border border-[#dadce0] px-4 text-sm outline-none"
            />
          </label>

          {error && <p className="rounded-lg bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#1a73e8] text-sm font-semibold text-white transition hover:bg-[#1558b0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
