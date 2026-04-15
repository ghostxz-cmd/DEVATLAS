"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type TwoFactorMethod = "totp" | "email";

export default function SignInPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard-profesor");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] = useState<TwoFactorMethod[]>([]);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("email");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorBackupCode, setTwoFactorBackupCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");

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

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Sesiunea nu a putut fi inițializată.");
      }

      const challengeResponse = await fetch("/api/auth/instructors/signin/challenge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const challengePayload = (await challengeResponse.json().catch(() => null)) as
        | {
            message?: string;
            requiresTwoFactor?: boolean;
            methods?: TwoFactorMethod[];
            preferredMethod?: TwoFactorMethod;
            maskedEmail?: string;
          }
        | null;

      if (!challengeResponse.ok) {
        throw new Error(challengePayload?.message ?? "Nu am putut porni verificarea 2FA.");
      }

      if (challengePayload?.requiresTwoFactor) {
        const methods = challengePayload.methods ?? ["email"];
        setTwoFactorMethods(methods);
        setTwoFactorMethod(challengePayload.preferredMethod ?? methods[0] ?? "email");
        setMaskedEmail(challengePayload.maskedEmail ?? "");
        setTwoFactorMessage(challengePayload.preferredMethod === "email" ? `Am trimis codul pe ${challengePayload.maskedEmail ?? "email"}.` : null);
        setTwoFactorOpen(true);
        return;
      }

      router.replace(nextPath);
    } catch (signInCatchError) {
      setError(signInCatchError instanceof Error ? signInCatchError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    try {
      setTwoFactorLoading(true);
      setTwoFactorMessage(null);

      const response = await fetch("/api/auth/instructors/signin/confirm-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "send_email_code",
          method: "email",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Nu am putut trimite codul pe email.");
      }

      setTwoFactorMethod("email");
      setTwoFactorMessage(payload?.message ?? `Am trimis codul pe ${maskedEmail}.`);
    } catch (sendError) {
      setTwoFactorMessage(sendError instanceof Error ? sendError.message : "Nu am putut trimite codul pe email.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirmTwoFactor = async () => {
    try {
      setTwoFactorLoading(true);
      setTwoFactorMessage(null);

      const response = await fetch("/api/auth/instructors/signin/confirm-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "verify",
          method: twoFactorMethod,
          code: twoFactorCode || undefined,
          backupCode: twoFactorMethod === "totp" ? twoFactorBackupCode || undefined : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Codul introdus nu este valid.");
      }

      router.replace(nextPath);
    } catch (confirmError) {
      setTwoFactorMessage(confirmError instanceof Error ? confirmError.message : "Codul introdus nu este valid.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-20 pt-20 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur sm:p-8 lg:p-10">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Instructor Access
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[0.95] sm:text-5xl lg:text-7xl">
              Conectare profesor.
              <span className="mt-3 block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                Dashboard avansat.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-gray-300 sm:text-lg">
              Acces dedicat pentru profesori cu gestionare cursuri, conținut și activitate în dashboardul de administrare.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Rol</div>
                <div className="mt-2 text-base font-semibold text-white">INSTRUCTOR</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Permisiuni</div>
                <div className="mt-2 text-base font-semibold text-white">Configurabile</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Audit</div>
                <div className="mt-2 text-base font-semibold text-white">Activitate monitorizată</div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500" />

          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Login profesor</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Intră în dashboard</h2>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="profesor@devatlas.ro"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-300">Parolă</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="••••••••"
              />
            </label>

            <Link href="/auth/forgot-password" className="inline-block text-sm font-medium text-slate-300 transition hover:text-cyan-300">
              Ai uitat parola?
            </Link>

            {error && (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-sm font-bold text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Se autentifică..." : "Intră în dashboard"}
            </button>
          </form>
        </section>
      </div>

      {twoFactorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#070b14] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.6)]">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Verificare 2FA</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Confirmă autentificarea</h3>
            <p className="mt-2 text-sm text-slate-300">
              {twoFactorMethod === "totp"
                ? "Introdu codul din aplicația Authenticator."
                : `Introdu codul primit pe ${maskedEmail || "email"}.`}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setTwoFactorMethod("totp")}
                  disabled={!twoFactorMethods.includes("totp")}
                  className={`h-10 rounded-xl text-sm font-semibold transition ${twoFactorMethod === "totp" ? "bg-cyan-400 text-black" : "text-slate-300 hover:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Authenticator
                </button>
                <button
                  type="button"
                  onClick={() => setTwoFactorMethod("email")}
                  disabled={!twoFactorMethods.includes("email")}
                  className={`h-10 rounded-xl text-sm font-semibold transition ${twoFactorMethod === "email" ? "bg-cyan-400 text-black" : "text-slate-300 hover:bg-white/10"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  Cod pe email
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                placeholder={twoFactorMethod === "totp" ? "Cod 6 cifre" : "Cod primit pe email"}
              />

              {twoFactorMethod === "totp" ? (
                <input
                  value={twoFactorBackupCode}
                  onChange={(event) => setTwoFactorBackupCode(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Backup code (opțional)"
                />
              ) : null}

              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={twoFactorLoading}
                className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-60"
              >
                Încearcă altă modalitate: trimite cod pe email
              </button>

              {twoFactorMessage ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">{twoFactorMessage}</div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTwoFactorOpen(false)}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleConfirmTwoFactor}
                disabled={twoFactorLoading}
                className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {twoFactorLoading ? "Verific..." : "Confirmă"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
