"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function InstructorForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/instructors/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut trimite codul de resetare.");
      }

      setStep("confirm");
      setSuccessMessage("Dacă emailul există în sistem, am trimis un cod de resetare.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nu am putut trimite codul.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (newPassword.length < 8) {
        throw new Error("Parola nouă trebuie să aibă minim 8 caractere.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Parolele noi nu se potrivesc.");
      }

      if (code.trim().length !== 6) {
        throw new Error("Codul trebuie să aibă 6 cifre.");
      }

      const response = await fetch("/api/auth/instructors/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: code.trim(),
          newPassword,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Nu am putut reseta parola.");
      }

      setSuccessMessage("Parola a fost resetată cu succes. Te poți autentifica acum.");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Nu am putut confirma resetarea.");
    } finally {
      setLoading(false);
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
              Resetare parolă.
              <span className="mt-3 block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500">
                Cod securizat.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-gray-300 sm:text-lg">
              Flux avansat pentru profesori: solicitare cod, verificare cod, actualizare parolă nouă.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signin" className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan-300">
                Înapoi la login profesor
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#070b14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500" />

          <form onSubmit={step === "request" ? handleRequestCode : handleConfirmReset} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-300">Email profesor</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                placeholder="profesor@devatlas.ro"
              />
            </label>

            {step === "confirm" && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-300">Cod resetare</span>
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    className="h-12 w-full rounded-2xl border border-white/12 bg-black/35 px-4 text-sm tracking-[0.4em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="123456"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-300">Parolă nouă</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
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
              </>
            )}

            {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            {successMessage && (
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-sm font-bold text-black shadow-[0_10px_30px_rgba(34,211,238,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (step === "request" ? "Se trimite codul..." : "Se actualizează parola...") : (step === "request" ? "Trimite codul" : "Resetează parola")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}