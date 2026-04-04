"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Navbar from "@/app/Navbar";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function StudentSignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [verificationStep, setVerificationStep] = useState<"details" | "code">("details");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordScore = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const validateDetails = () => {
    if (fullName.trim().length < 2) {
      throw new Error("Numele trebuie să aibă cel puțin 2 caractere.");
    }
    if (!email.trim()) {
      throw new Error("Emailul este obligatoriu.");
    }
    if (password.length < 8) {
      throw new Error("Parola trebuie să aibă minim 8 caractere.");
    }
    if (password !== confirmPassword) {
      throw new Error("Parolele nu se potrivesc.");
    }
    if (!acceptTerms) {
      throw new Error("Trebuie să accepți termenii pentru a crea contul.");
    }
  };

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      validateDetails();

      const response = await fetch("/api/auth/students/verification/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut trimite codul de verificare.");
      }

      setVerificationStep("code");
      setVerificationCode("");
      setSuccessMessage("Am trimis un cod de verificare pe email. Introdu-l mai jos pentru a crea contul.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Nu am putut trimite codul.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      validateDetails();
      if (verificationCode.trim().length !== 6) {
        throw new Error("Introdu un cod valid de 6 cifre.");
      }

      const response = await fetch("/api/auth/students/verification/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode.trim(),
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut verifica codul.");
      }

      const payload = (await response.json()) as {
        accountAlreadyExists?: boolean;
        message?: string;
      };

      if (payload.accountAlreadyExists) {
        setSuccessMessage(payload.message ?? "Contul există deja. Te redirecționez către login.");
        window.setTimeout(() => {
          router.push("/auth/elevi/signin");
        }, 1400);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.push("/cursuri");
      } catch (signInAfterCreateError) {
        const signInErrorMessage = signInAfterCreateError instanceof Error ? signInAfterCreateError.message : "";

        if (
          signInErrorMessage.includes("NEXT_PUBLIC_SUPABASE_URL") ||
          signInErrorMessage.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        ) {
          setSuccessMessage("Contul a fost creat. Autentifică-te din pagina de login după ce sunt setate variabilele de mediu publice.");
        } else {
          setSuccessMessage("Contul a fost creat. Te redirecționez către login pentru autentificare manuală.");
        }

        window.setTimeout(() => {
          router.push("/auth/elevi/signin");
        }, 1600);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Nu am putut crea contul.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_24%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute -right-24 top-16 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -left-24 bottom-8 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] backdrop-blur sm:p-8 lg:p-10">
            <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Student Onboarding
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[0.95] sm:text-5xl lg:text-7xl">
                Creează contul.
                <span className="mt-3 block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                  Într-un flow curat.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-gray-300 sm:text-lg">
                Aici păstrăm doar lucrurile importante: identitate vizuală clară, structură aerisită și pașii esențiali pentru a intra în platformă.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">1</div>
                  <div className="mt-2 text-base font-semibold text-white">Completezi datele</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">2</div>
                  <div className="mt-2 text-base font-semibold text-white">Confirmi codul primit</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-400">3</div>
                  <div className="mt-2 text-base font-semibold text-white">Contul devine activ</div>
                </div>
              </div>

              <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-[#050814]/95 p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.7)]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Acces pentru elevi</div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Contul este creat pentru parcursul de învățare, nu pentru administrare.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth/elevi/signin" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan-300">
                  Am deja cont
                </Link>
                <Link href="/auth/signin" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Ești profesor? autentifică-te aici
                </Link>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400" />

            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Înregistrare elev</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Creează cont nou</h2>
              </div>
              <Link href="/auth/elevi/signin" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                Login elev
              </Link>
            </div>

            <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-[#050814]/95 p-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#050814]/95 p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Securitate</div>
                <div className="mt-2 text-sm font-semibold text-white">Parolă protejată</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#050814]/95 p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Rol</div>
                <div className="mt-2 text-sm font-semibold text-white">STUDENT</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#050814]/95 p-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Flow</div>
                <div className="mt-2 text-sm font-semibold text-white">Rapid și clar</div>
              </div>
            </div>

            <form onSubmit={verificationStep === "details" ? handleSendCode : handleVerifyAndCreateAccount} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-300">Nume complet</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Andrei Popescu"
                />
              </label>

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

              <div className="grid gap-4 sm:grid-cols-2">
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

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-300">Confirmă parola</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              {verificationStep === "code" && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-300">Cod de verificare</span>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm tracking-[0.4em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="123456"
                  />
                </label>
              )}

              <div className="rounded-2xl border border-white/10 bg-[#050814]/95 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Putere parolă</div>
                    <div className="mt-1 text-sm text-slate-300">Minim 8 caractere, ideal cu litere mari și cifre</div>
                  </div>
                  <div className="text-sm font-semibold text-white">{passwordScore}/4</div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full ${index < passwordScore ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-white/10"}`}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#050814]/95 p-4 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400"
                />
                Sunt de acord cu termenii platformei și cu folosirea emailului pentru cont, confirmări și notificări.
              </label>

              {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
              {successMessage && (
                <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </p>
              )}

              {verificationStep === "code" && (
                <button
                  type="button"
                  onClick={() => {
                    setVerificationStep("details");
                    setVerificationCode("");
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Schimbă datele
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-sm font-bold text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? verificationStep === "details"
                    ? "Se trimite codul..."
                    : "Se verifică codul..."
                  : verificationStep === "details"
                    ? "Trimite codul pe email"
                    : "Verifică și creează contul"}
              </button>
            </form>

            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-[#050814]/95 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
                <div>
                  <p className="font-semibold text-white">Ești profesor?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Pentru zona de administrare folosește loginul profesorilor.
                  </p>
                  <Link href="/auth/signin" className="mt-2 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                    Autentifică-te aici
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
