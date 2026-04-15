"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Navbar from "@/app/Navbar";

type TwoFactorMethod = "totp" | "email";

export default function StudentSignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/students/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut face autentificarea.");
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        requiresTwoFactor?: boolean;
        methods?: TwoFactorMethod[];
        preferredMethod?: TwoFactorMethod;
        maskedEmail?: string;
      };

      if (payload.requiresTwoFactor) {
        const methods = payload.methods ?? ["email"];
        setTwoFactorMethods(methods);
        setTwoFactorMethod(payload.preferredMethod ?? methods[0] ?? "email");
        setMaskedEmail(payload.maskedEmail ?? "");
        setTwoFactorMessage(payload.preferredMethod === "email" ? `Am trimis codul pe ${payload.maskedEmail ?? "email"}.` : null);
        setTwoFactorOpen(true);
        return;
      }

      const sessionResponse = await fetch("/api/auth/students/session", { cache: "no-store" });
      if (!sessionResponse.ok) {
        throw new Error("Autentificarea nu a putut fi finalizată. Încearcă din nou.");
      }

      router.replace("/dashboard-elev");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Nu am putut face autentificarea.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    try {
      setTwoFactorLoading(true);
      setTwoFactorMessage(null);

      const response = await fetch("/api/auth/students/signin/confirm-2fa", {
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

      const response = await fetch("/api/auth/students/signin/confirm-2fa", {
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

      const sessionResponse = await fetch("/api/auth/students/session", { cache: "no-store" });
      if (!sessionResponse.ok) {
        throw new Error("Autentificarea nu a putut fi finalizată. Încearcă din nou.");
      }

      router.replace("/dashboard-elev");
    } catch (confirmError) {
      setTwoFactorMessage(confirmError instanceof Error ? confirmError.message : "Codul introdus nu este valid.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute -left-24 top-20 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Student Access
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[0.95] sm:text-5xl lg:text-7xl">
                Conectare elev.
                <span className="mt-3 block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                  Simplu, curat, rapid.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-gray-300 sm:text-lg">
                Punct de intrare clar în platformă, fără aglomerare. Designul urmărește estetica DevAtlas: fundal întunecat, accente reci și componente mari.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Curat</div>
                  <div className="mt-2 text-base font-semibold text-white">Fără haos vizual</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Rapid</div>
                  <div className="mt-2 text-base font-semibold text-white">Intrare imediată</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Util</div>
                  <div className="mt-2 text-base font-semibold text-white">Tot ce ai nevoie</div>
                </div>
              </div>


              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth/elevi/signup" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan-300">
                  Creează cont de elev
                </Link>
                <Link href="/auth/signin" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Ești profesor? autentifică-te aici
                </Link>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500" />

            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Login elev</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Intră în cont</h2>
              </div>
              <Link href="/auth/elevi/signup" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                Nu ai cont?
              </Link>
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
                  placeholder="nume@exemplu.ro"
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

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400"
                  />
                  Ține-mă minte
                </label>
              </div>

              <Link href="/auth/elevi/forgot-password" className="inline-block text-sm font-medium text-slate-300 transition hover:text-cyan-300">
                Ai uitat parola?
              </Link>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-sm font-bold text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Se autentifică..." : "Intră în cont"}
              </button>
            </form>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Siguranță</div>
                <div className="mt-2 text-sm font-semibold text-white">Sesiune protejată</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Acces</div>
                <div className="mt-2 text-sm font-semibold text-white">Începi direct cursurile</div>
              </div>
            </div>
          </section>
        </div>
      </main>

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
    </>
  );
}
