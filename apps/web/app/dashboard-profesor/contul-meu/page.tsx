"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AccountSettings = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    role: string;
  };
  preferences: {
    theme: "dark" | "light";
    language: "ro" | "en";
    accentColor: "cyan" | "emerald" | "amber" | "rose" | "violet";
    density: "comfortable" | "compact" | "spacious";
    reducedMotion: boolean;
    highContrast: boolean;
    emailNotifications: boolean;
    weeklyDigest: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
    profileVisibility: "private" | "public";
    learningMode: "balanced" | "focused" | "accelerated";
    autoSave: boolean;
    compactNavigation: boolean;
    showHints: boolean;
    sessionTimeoutMinutes: number;
    dashboardCards: "all" | "compact";
    smartSummaries: boolean;
    focusMode: boolean;
  };
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400";

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-white">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full border transition ${value ? "border-cyan-400/40 bg-cyan-400/25" : "border-white/10 bg-[#030712]"}`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#030712] shadow transition ${
            value ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function InstructorDashboardAccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<AccountSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Nu exista o sesiune activa de profesor.");
        }

        const response = await fetch("/api/account/settings", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(payload?.message || "Nu am putut incarca datele contului.");
        }

        setData((await response.json()) as AccountSettings);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut incarca datele contului.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const initials = useMemo(() => (data?.profile.fullName?.trim().charAt(0) || "P").toUpperCase(), [data]);

  const updatePreference = <K extends keyof AccountSettings["preferences"]>(
    key: K,
    value: AccountSettings["preferences"][K],
  ) => {
    setData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        preferences: {
          ...current.preferences,
          [key]: value,
        },
      };
    });
  };

  const updateProfile = (payload: Partial<AccountSettings["profile"]>) => {
    setData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        profile: {
          ...current.profile,
          ...payload,
        },
      };
    });
  };

  const save = async () => {
    if (!data) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Nu exista o sesiune activa de profesor.");
      }

      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: data.profile.fullName,
          timezone: data.profile.timezone,
          avatarUrl: data.profile.avatarUrl,
          preferences: data.preferences,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Nu am putut salva datele contului.");
      }

      setMessage("Datele contului au fost actualizate.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nu am putut salva datele contului.");
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#030712] p-6 text-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
        <h1 className="text-2xl font-bold">Contul meu</h1>
        <p className="mt-2 text-sm text-gray-300">Nu am putut incarca datele contului.</p>
        <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Contul meu</h1>
          <p className="mt-1 text-sm text-gray-300">Setari reale pentru contul de profesor si preferintele dashboard-ului.</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading || !data}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Se salveaza..." : "Salveaza"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">{message}</div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <h3 className="text-sm font-semibold text-white">Profil</h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] text-sm font-black text-white">{initials}</div>
            <div>
              <p className="text-sm font-semibold text-white">{data?.profile.email ?? "-"}</p>
              <p className="text-xs text-gray-300">Rol: {data?.profile.role ?? "INSTRUCTOR"}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Nume complet</label>
              <input
                value={data?.profile.fullName ?? ""}
                onChange={(event) => updateProfile({ fullName: event.target.value })}
                className={inputClass}
                placeholder="Nume instructor"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">Timezone</label>
              <input
                value={data?.profile.timezone ?? ""}
                onChange={(event) => updateProfile({ timezone: event.target.value || null })}
                className={inputClass}
                placeholder="Europe/Bucharest"
              />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <h3 className="text-sm font-semibold text-white">Preferinte</h3>
          <div className="mt-4 grid gap-3">
            <ToggleRow
              label="Notificari email"
              value={data?.preferences.emailNotifications ?? true}
              onChange={(next) => updatePreference("emailNotifications", next)}
            />
            <ToggleRow
              label="Alerte de securitate"
              value={data?.preferences.securityAlerts ?? true}
              onChange={(next) => updatePreference("securityAlerts", next)}
            />
            <ToggleRow
              label="Rezumat saptamanal"
              value={data?.preferences.weeklyDigest ?? true}
              onChange={(next) => updatePreference("weeklyDigest", next)}
            />
            <ToggleRow
              label="Navigatie compacta"
              value={data?.preferences.compactNavigation ?? false}
              onChange={(next) => updatePreference("compactNavigation", next)}
            />
            <ToggleRow
              label="Focus mode"
              value={data?.preferences.focusMode ?? false}
              onChange={(next) => updatePreference("focusMode", next)}
            />
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-white/10 bg-[#030712] p-4 text-sm text-gray-300 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
        Configuratiile de securitate avansata (PIN/TOTP) din acest tab folosesc in prezent fluxul de elev. Le pot extinde separat pentru instructor daca vrei acelasi set complet.
      </article>
    </section>
  );
}
