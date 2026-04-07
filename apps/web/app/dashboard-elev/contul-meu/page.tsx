"use client";

import { useEffect, useMemo, useState } from "react";

type AccountSettings = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    role: string;
  };
  preferences: {
    theme: string;
    language: string;
    accentColor: string;
    density: string;
    reducedMotion: boolean;
    highContrast: boolean;
    emailNotifications: boolean;
    weeklyDigest: boolean;
    securityAlerts: boolean;
    productUpdates: boolean;
    profileVisibility: string;
    learningMode: string;
    autoSave: boolean;
    compactNavigation: boolean;
    showHints: boolean;
    sessionTimeoutMinutes: number;
    dashboardCards: string;
    smartSummaries: boolean;
    focusMode: boolean;
  };
};

function booleanLabel(value: boolean) {
  return value ? "Activ" : "Inactiv";
}

function statusColor(value: boolean) {
  return value ? "bg-[#22c55e]" : "bg-[#94a3b8]";
}

export default function StudentDashboardAccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AccountSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/account/settings", { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || "Nu am putut încărca setările contului.");
        }

        const payload = (await response.json()) as AccountSettings;
        setData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Nu am putut încărca setările contului.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const profileInitial = useMemo(() => (data?.profile.fullName.trim().charAt(0) || "E").toUpperCase(), [data]);

  if (error) {
    return (
      <section className="space-y-4 text-[#111827]">
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <h1 className="text-2xl font-bold tracking-tight">Contul meu</h1>
          <p className="mt-2 text-sm text-[#64748b]">Nu am putut încărca datele contului.</p>
          <div className="mt-4 rounded-2xl border border-[#fca5a5] bg-[#fff1f2] p-4 text-sm text-[#991b1b]">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 text-[#111827]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[34px]">Contul meu</h1>
          <p className="mt-1 text-sm text-[#64748b]">Profil, securitate avansată, preferințe și protecție pentru modificările sensibile.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d5daea] bg-[#f8faff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]">
          <span className={`h-2 w-2 rounded-full ${loading ? "bg-[#f59e0b]" : "bg-[#22c55e]"}`} />
          {loading ? "syncing" : "active"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Profil</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] text-sm font-black text-white">
              {profileInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#0f172a]">{data?.profile.fullName ?? "Elev"}</p>
              <p className="truncate text-sm text-[#64748b]">{data?.profile.email ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2 text-[#334155]">Rol: {data?.profile.role ?? "STUDENT"}</div>
            <div className="rounded-2xl border border-[#d6deef] bg-[#f8faff] px-2.5 py-2 text-[#334155]">Timezone: {data?.profile.timezone || "nesetat"}</div>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Securitate</p>
          <div className="mt-2 text-[30px] font-bold leading-none">Protecție</div>
          <p className="mt-1 text-xs text-[#64748b]">PIN, 2FA și confirmări suplimentare pentru date sensibile.</p>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Notificări</p>
          <div className="mt-2 text-[30px] font-bold leading-none">{booleanLabel(data?.preferences.emailNotifications ?? false)}</div>
          <p className="mt-1 text-xs text-[#64748b]">Email, security alerts și digest.</p>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Privacy</p>
          <div className="mt-2 text-[30px] font-bold leading-none capitalize">{data?.preferences.profileVisibility ?? "private"}</div>
          <p className="mt-1 text-xs text-[#64748b]">Vizibilitate profil și focus mode.</p>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Setări avansate de cont</h3>
            <span className="text-xs text-[#64748b]">real settings</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              ["Tema", data?.preferences.theme ?? "dark"],
              ["Limbă", data?.preferences.language ?? "ro"],
              ["Accent", data?.preferences.accentColor ?? "cyan"],
              ["Densitate", data?.preferences.density ?? "comfortable"],
              ["Mod învățare", data?.preferences.learningMode ?? "balanced"],
              ["Ses. timeout", `${data?.preferences.sessionTimeoutMinutes ?? 60} min`],
              ["Dashboard cards", data?.preferences.dashboardCards ?? "all"],
              ["Smart summaries", booleanLabel(data?.preferences.smartSummaries ?? false)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#64748b]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[#0f172a]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-[#d6deef] bg-gradient-to-r from-[#eff6ff] to-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Ce se salvează acum</p>
            <ul className="mt-2 space-y-1 text-sm text-[#334155]">
              <li>• nume, avatar și timezone</li>
              <li>• preferințe de interfață și notificări</li>
              <li>• opțiuni de accesibilitate și focus</li>
            </ul>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#111827]">Securitate avansată</h3>
            <span className="text-xs text-[#64748b]">prepared</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">2FA cu Authenticator</p>
                  <p className="mt-1 text-xs text-[#64748b]">Pregătit pentru coduri TOTP, QR și backup codes.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(false)} bg-opacity-10 text-[#334155]`}>Nu e activ</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" className="rounded-2xl border border-[#d5daea] bg-white px-3 py-3 text-left text-sm font-semibold text-[#0f172a]">
                  Configurează 2FA
                  <span className="mt-1 block text-xs font-normal text-[#64748b]">QR + aplicația Authenticator</span>
                </button>
                <button type="button" className="rounded-2xl border border-[#d5daea] bg-white px-3 py-3 text-left text-sm font-semibold text-[#0f172a]">
                  Coduri backup
                  <span className="mt-1 block text-xs font-normal text-[#64748b]">Salvare coduri de rezervă</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">PIN de protecție</p>
                  <p className="mt-1 text-xs text-[#64748b]">Poate bloca schimbarea emailului, parolei și a setărilor sensibile.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(false)} bg-opacity-10 text-[#334155]`}>Nepus</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" className="rounded-2xl border border-[#d5daea] bg-white px-3 py-3 text-left text-sm font-semibold text-[#0f172a]">
                  Setează PIN
                  <span className="mt-1 block text-xs font-normal text-[#64748b]">4-6 cifre, separat de parola contului</span>
                </button>
                <button type="button" className="rounded-2xl border border-[#d5daea] bg-white px-3 py-3 text-left text-sm font-semibold text-[#0f172a]">
                  Verifică PIN
                  <span className="mt-1 block text-xs font-normal text-[#64748b]">Cerut la schimbări sensibile</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-sm font-semibold text-[#0f172a]">Protecție schimbări cont</p>
              <div className="mt-3 space-y-2 text-sm text-[#334155]">
                {[
                  ["Modificare email", false],
                  ["Schimbare parolă", false],
                  ["Reset sesiuni active", false],
                  ["Export date personale", false],
                ].map(([label, enabled]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2">
                    <span>{label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${enabled ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f1f5f9] text-[#475569]"}`}>
                      {enabled ? "Protejat" : "Cer PIN/2FA"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_0.8fr]">
        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">Notificări și privacy</h3>
            <span className="text-xs text-[#64748b]">settings</span>
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["Email notifications", data?.preferences.emailNotifications ?? false],
              ["Security alerts", data?.preferences.securityAlerts ?? false],
              ["Weekly digest", data?.preferences.weeklyDigest ?? false],
              ["Product updates", data?.preferences.productUpdates ?? false],
              ["Show hints", data?.preferences.showHints ?? false],
              ["Focus mode", data?.preferences.focusMode ?? false],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-3">
                <span className="text-sm text-[#0f172a]">{label as string}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${value ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f1f5f9] text-[#475569]"}`}>{booleanLabel(Boolean(value))}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">Activitate cont</h3>
            <span className="text-xs text-[#64748b]">real</span>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm text-[#334155]">
            Datele de profil și preferințe vin din `/api/account/settings`.
          </div>

          <div className="mt-3 rounded-2xl border border-[#d6deef] bg-gradient-to-br from-[#eff6ff] via-white to-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">Ce lipsește pentru 2FA/PIN real</p>
            <ul className="mt-2 space-y-1 text-sm text-[#334155]">
              <li>• stocare secret TOTP per user</li>
              <li>• endpoint de activare și validare coduri</li>
              <li>• PIN hash + verificare la schimbări sensibile</li>
            </ul>
          </div>
        </article>

        <article className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">Stare cont</h3>
            <span className="text-xs text-[#64748b]">summary</span>
          </div>

          <div className="mt-4 space-y-2 text-sm text-[#334155]">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">Calendar: {data?.preferences.density ?? "comfortable"}</div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">Auto-save: {booleanLabel(data?.preferences.autoSave ?? false)}</div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">Compact nav: {booleanLabel(data?.preferences.compactNavigation ?? false)}</div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-3">High contrast: {booleanLabel(data?.preferences.highContrast ?? false)}</div>
          </div>
        </article>
      </div>
    </section>
  );
}
