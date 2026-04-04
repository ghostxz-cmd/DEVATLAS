"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../ThemeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Preferences = {
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

type AccountProfile = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
  role: string;
};

type SettingsState = {
  profile: AccountProfile;
  preferences: Preferences;
  passwordHint: string;
};

type SectionKey = "general" | "appearance" | "notifications" | "privacy" | "productivity" | "security";

type SettingsResponse = {
  profile: AccountProfile;
  preferences: Partial<Preferences>;
};

const preferenceDefaults: Preferences = {
  theme: "dark",
  language: "ro",
  accentColor: "cyan",
  density: "comfortable",
  reducedMotion: false,
  highContrast: false,
  emailNotifications: true,
  weeklyDigest: true,
  securityAlerts: true,
  productUpdates: false,
  profileVisibility: "private",
  learningMode: "balanced",
  autoSave: true,
  compactNavigation: false,
  showHints: true,
  sessionTimeoutMinutes: 60,
  dashboardCards: "all",
  smartSummaries: true,
  focusMode: false,
};

const sections: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: "general", label: "General", description: "Profil, avatar, email" },
  { key: "appearance", label: "Apariție", description: "Temă și culori" },
  { key: "notifications", label: "Notificări", description: "Email și alerte" },
  { key: "privacy", label: "Confidențialitate", description: "Vizibilitate și sesiune" },
  { key: "productivity", label: "Productivitate", description: "Workflow și dashboard" },
  { key: "security", label: "Securitate", description: "Parolă și protecție" },
];

const accentOptions = ["cyan", "emerald", "amber", "rose", "violet"] as const;
const languageOptions = [
  { value: "ro", label: "Română" },
  { value: "en", label: "English" },
] as const;
const densityOptions = [
  { value: "comfortable", label: "Comfortabil" },
  { value: "compact", label: "Compact" },
  { value: "spacious", label: "Spațios" },
] as const;
const learningModeOptions = [
  { value: "balanced", label: "Echilibrat" },
  { value: "focused", label: "Focus maxim" },
  { value: "accelerated", label: "Accelerat" },
] as const;
const dashboardCardOptions = [
  { value: "all", label: "Toate cardurile" },
  { value: "compact", label: "Carduri compacte" },
] as const;
const visibilityOptions = [
  { value: "private", label: "Privat" },
  { value: "public", label: "Public" },
] as const;

function mergePreferences(preferences?: Partial<Preferences> | null): Preferences {
  return {
    ...preferenceDefaults,
    ...(preferences ?? {}),
  };
}

function initialsFromName(fullName: string | null | undefined, email: string | null | undefined) {
  return (fullName?.trim().charAt(0) || email?.charAt(0) || "U").toUpperCase();
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-gray-400">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 rounded-full border transition ${checked ? "border-cyan-400/40 bg-cyan-400/25" : "border-white/15 bg-white/10"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${checked ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-300/80">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>
    </div>
  );
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { theme, setTheme } = useTheme();
  const hasPublicSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [settings, setSettings] = useState<SettingsState>({
    profile: {
      fullName: "",
      email: "",
      avatarUrl: null,
      timezone: null,
      role: "STUDENT",
    },
    preferences: preferenceDefaults,
    passwordHint: "",
  });

  const passwordResetPath = useMemo(() => {
    if (settings.profile.role === "INSTRUCTOR") {
      return "/auth/forgot-password";
    }

    return "/auth/elevi/forgot-password";
  }, [settings.profile.role]);

  const section = sections.find((item) => item.key === activeSection) ?? sections[0];
  const profileInitial = initialsFromName(settings.profile.fullName, settings.profile.email);
  const isLight = theme === "light";

  const getSafeSupabaseClient = () => {
    if (!hasPublicSupabaseEnv) {
      return null;
    }

    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const supabase = getSafeSupabaseClient();
    if (!supabase) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/account/settings", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as Partial<SettingsResponse>;
      const mergedPreferences = mergePreferences(payload.preferences);
      setSettings({
        profile: {
          fullName: payload.profile?.fullName ?? "",
          email: payload.profile?.email ?? "",
          avatarUrl: payload.profile?.avatarUrl ?? null,
          timezone: payload.profile?.timezone ?? null,
          role: payload.profile?.role ?? "STUDENT",
        },
        preferences: mergedPreferences,
        passwordHint: payload.profile?.role === "ADMIN" ? "Autentificare admin" : "Schimbare parolă în siguranță",
      });
      setTheme(mergedPreferences.theme);
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    void loadSettings().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load settings.");
      setIsLoading(false);
    });
  }, [setTheme]);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setSettings((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [key]: value,
      },
    }));

    if (key === "theme") {
      setTheme(value as Preferences["theme"]);
    }
  };

  const updateProfile = <K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) => {
    setSettings((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [key]: value,
      },
    }));
  };

  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        throw new Error("Setările nu sunt disponibile momentan.");
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        throw new Error("Trebuie să fii autentificat ca să încarci o poză.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/account/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as { avatarUrl: string };
      updateProfile("avatarUrl", payload.avatarUrl);
      setSuccessMessage("Poza de profil a fost încărcată cu succes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nu am putut încărca poza.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSafeSupabaseClient();
      if (!supabase) {
        throw new Error("Setările nu sunt disponibile momentan.");
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        throw new Error("Trebuie să fii autentificat ca să salvezi setările.");
      }

      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: settings.profile.fullName.trim(),
          avatarUrl: settings.profile.avatarUrl?.trim() ? settings.profile.avatarUrl.trim() : null,
          timezone: settings.profile.timezone?.trim() ? settings.profile.timezone.trim() : null,
          preferences: settings.preferences,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Nu am putut salva setările.");
      }

      setTheme(settings.preferences.theme);
      setSuccessMessage("Setările au fost salvate și sincronizate.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nu am putut salva setările.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSafeSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    await fetch("/api/auth/students/signout", { method: "POST" }).catch(() => undefined);
    router.push("/");
  };

  if (isLoading) {
    return (
      <main className={`min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8 ${isLight ? "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)]"}`}>
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="h-7 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-4 w-72 animate-pulse rounded-full bg-white/10" />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/10" />
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/10" />
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/10" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={`min-h-screen px-4 py-10 text-white sm:px-6 lg:px-8 ${isLight ? "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)]"}`}>
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center">
          <div className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-16 left-0 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative z-10 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
              Setări cont
            </div>
            <h1 className="relative z-10 mt-5 max-w-3xl text-4xl font-black leading-[0.92] sm:text-5xl lg:text-7xl">
              Tot ce ține de contul tău, într-un singur loc.
            </h1>
            <p className="relative z-10 mt-4 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
              Profil, temă, notificări, confidențialitate și preferințe de lucru. După autentificare, această pagină devine centrul tău de control.
            </p>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              <Link href="/auth/elevi/signin" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100">
                Intră ca elev
              </Link>
              <Link href="/auth/signin" className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Intră ca profesor
              </Link>
              <Link href="/auth/admin/signin" className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Intră ca admin
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const surfaceClass = isLight
    ? "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] text-[#111827]"
    : "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] text-white";
  const panelClass = isLight ? "border-black/10 bg-white/85 text-[#111827]" : "border-white/10 bg-white/5 text-white";
  const panelSoftClass = isLight ? "border-black/10 bg-white/70" : "border-white/10 bg-white/5";
  const mutedText = isLight ? "text-slate-600" : "text-gray-400";
  const sectionText = isLight ? "text-slate-700" : "text-gray-300";
  const inputClass = isLight
    ? "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-cyan-500/40"
    : "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40";

  return (
    <main className={`min-h-screen px-4 py-8 sm:px-6 lg:px-8 ${surfaceClass}`}>
      <div className="absolute inset-x-0 top-24 -z-0 flex justify-center pointer-events-none">
        <div className="h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <section className={`relative overflow-hidden rounded-[2.75rem] border shadow-2xl backdrop-blur-xl ${panelClass}`}>
          <div className={`absolute -right-24 top-0 h-72 w-72 opacity-30 blur-3xl ${isLight ? "bg-blue-200" : "bg-white"}`} />
          <div className={`absolute -left-20 bottom-0 h-64 w-64 rounded-full blur-3xl ${isLight ? "bg-cyan-200" : "bg-cyan-500/20"}`} />

          <div className="relative z-10 p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-4xl">
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-200">
                  Setări avansate cont
                </div>
                <h1 className={`mt-5 text-4xl font-black leading-[0.94] sm:text-5xl lg:text-7xl ${isLight ? "text-[#0f172a]" : "text-white"}`}>
                  Un hub de cont construit pe secțiuni, nu pe aglomerație.
                </h1>
                <p className={`mt-4 max-w-3xl text-sm leading-7 sm:text-base ${sectionText}`}>
                  Intră în General, Apariție, Notificări, Confidențialitate, Productivitate sau Securitate. Apăsarea unei secțiuni îți arată doar acel panou, iar schimbările de temă și avatar se salvează real.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px] xl:flex-none">
                <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                  <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Secțiune activă</div>
                  <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{section.label}</div>
                </div>
                <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                  <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Tema</div>
                  <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{theme === "light" ? "Luminoasă" : "Întunecată"}</div>
                </div>
                <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                  <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Rol</div>
                  <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.profile.role}</div>
                </div>
              </div>
            </div>

            {errorMessage && <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}
            {successMessage && <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{successMessage}</div>}

            <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
              <aside className={`rounded-[2rem] border p-4 ${panelSoftClass}`}>
                <div className={`rounded-[1.75rem] border border-white/10 p-4 ${isLight ? "bg-white/70" : "bg-black/20"}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400 to-blue-500">
                      {settings.profile.avatarUrl ? <img src={settings.profile.avatarUrl} alt="Avatar profil" className="h-full w-full object-cover" /> : <div className={`grid h-full w-full place-items-center text-2xl font-black ${isLight ? "text-[#0f172a]" : "text-black"}`}>{profileInitial}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.profile.fullName || "Cont DevAtlas"}</div>
                      <div className={`truncate text-xs ${mutedText}`}>{settings.profile.email}</div>
                      <div className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-200">
                        {settings.profile.role}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {sections.map((item) => {
                    const active = item.key === activeSection;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveSection(item.key)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${active ? "border-cyan-400/40 bg-cyan-400/15" : isLight ? "border-black/10 bg-white/70 hover:bg-white" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                      >
                        <div>
                          <div className={`text-sm font-medium ${isLight ? "text-[#0f172a]" : "text-white"}`}>{item.label}</div>
                          <div className={`text-xs ${mutedText}`}>{item.description}</div>
                        </div>
                        <span className={`text-xs font-semibold ${active ? "text-cyan-300" : mutedText}`}>→</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                  <div className={`text-xs font-semibold uppercase tracking-[0.25em] ${mutedText}`}>Scurtături</div>
                  <div className="mt-4 space-y-2 text-sm text-gray-300">
                    <Link href={passwordResetPath} className={`block rounded-2xl border border-white/10 px-4 py-3 transition ${isLight ? "bg-white text-[#111827] hover:bg-slate-100" : "bg-black/20 hover:bg-white/10 hover:text-white"}`}>
                      Schimbă parola
                    </Link>
                    <button type="button" onClick={handleLogout} className="block w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left font-medium text-red-200 transition hover:bg-red-500/15">
                      Ieși din cont
                    </button>
                  </div>
                </div>
              </aside>

              <div className="space-y-6">
                {activeSection === "general" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="General" title="Profilul tău și poza de cont" description="Aici setezi datele esențiale. Poți încărca o imagine reală, nu doar un URL, iar sistemul o salvează separat pe cont." />

                    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                      <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                        <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/30 to-blue-500/30">
                          {settings.profile.avatarUrl ? <img src={settings.profile.avatarUrl} alt="Avatar profil" className="h-full w-full object-cover" /> : <div className={`grid h-full w-full place-items-center text-6xl font-black ${isLight ? "text-[#0f172a]" : "text-white"}`}>{profileInitial}</div>}
                        </div>

                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadAvatar(file);
                          }
                          event.currentTarget.value = "";
                        }} />

                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar} className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">
                          {isUploadingAvatar ? "Se încarcă poza..." : "Încarcă poză de profil"}
                        </button>

                        <button type="button" onClick={() => updateProfile("avatarUrl", null)} className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isLight ? "border-black/10 bg-white text-[#111827] hover:bg-slate-100" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>
                          Elimină poza
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 sm:col-span-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Nume complet</span>
                          <input value={settings.profile.fullName ?? ""} onChange={(event) => updateProfile("fullName", event.target.value)} className={inputClass} placeholder="Nume și prenume" />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Email</span>
                          <input value={settings.profile.email ?? ""} readOnly className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isLight ? "border-black/10 bg-slate-100 text-slate-500" : "border-white/10 bg-black/30 text-gray-300"}`} />
                        </label>

                        <label className="space-y-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Timezone</span>
                          <input value={settings.profile.timezone ?? ""} onChange={(event) => updateProfile("timezone", event.target.value)} className={inputClass} placeholder="Europe/Bucharest" />
                        </label>

                        <label className="space-y-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Sursă avatar</span>
                          <input value={settings.profile.avatarUrl ?? ""} readOnly className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isLight ? "border-black/10 bg-slate-100 text-slate-500" : "border-white/10 bg-black/30 text-gray-300"}`} placeholder="Se completează după upload" />
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                        <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Avatar</div>
                        <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.profile.avatarUrl ? "Încărcat" : "Implicit"}</div>
                      </div>
                      <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                        <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Poziție secțiune</div>
                        <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{section.label}</div>
                      </div>
                      <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                        <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Persoană</div>
                        <div className={`mt-2 text-lg font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.profile.role}</div>
                      </div>
                    </div>
                  </article>
                )}

                {activeSection === "appearance" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="Apariție" title="Schimbă tema și vezi diferența imediat" description="Apăsarea butonului de temă schimbă între dark și light pe loc, iar accentul se salvează împreună cu restul preferințelor." />

                    <div className={`rounded-[2rem] border p-5 ${isLight ? "border-black/10 bg-slate-100" : "border-white/10 bg-black/20"}`}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <button type="button" onClick={() => updatePreference("theme", "dark")} className={`rounded-[1.75rem] border px-4 py-5 text-left transition ${settings.preferences.theme === "dark" ? "border-cyan-400/50 bg-cyan-400/15" : isLight ? "border-black/10 bg-white hover:bg-white" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                          <div className={`text-sm font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>Temă întunecată</div>
                          <div className={`mt-2 text-xs leading-5 ${mutedText}`}>Contrast mare, clară pe conținut și potrivită pentru lucru mult timp.</div>
                        </button>

                        <button type="button" onClick={() => updatePreference("theme", "light")} className={`rounded-[1.75rem] border px-4 py-5 text-left transition ${settings.preferences.theme === "light" ? "border-cyan-400/50 bg-cyan-400/15" : isLight ? "border-black/10 bg-white hover:bg-white" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                          <div className={`text-sm font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>Temă luminoasă</div>
                          <div className={`mt-2 text-xs leading-5 ${mutedText}`}>Mai aerisită și mai apropiată de un dashboard de produs modern.</div>
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Accent</span>
                          <select value={settings.preferences.accentColor} onChange={(event) => updatePreference("accentColor", event.target.value as Preferences["accentColor"])} className={inputClass}>
                            {accentOptions.map((accent) => <option key={accent} value={accent} className="bg-black text-white">{accent}</option>)}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Densitate</span>
                          <select value={settings.preferences.density} onChange={(event) => updatePreference("density", event.target.value as Preferences["density"])} className={inputClass}>
                            {densityOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                          </select>
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Limbă</span>
                          <select value={settings.preferences.language} onChange={(event) => updatePreference("language", event.target.value as Preferences["language"])} className={inputClass}>
                            {languageOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                          </select>
                        </label>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                          <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Preview</div>
                          <div className={`mt-2 text-xl font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.preferences.theme === "light" ? "Luminos" : "Întunecat"}</div>
                          <p className={`mt-2 text-sm ${mutedText}`}>Schimbarea de temă se vede imediat în pagină și se salvează în browser.</p>
                        </div>
                        <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                          <div className={`text-[11px] uppercase tracking-[0.25em] ${mutedText}`}>Tipografie</div>
                          <div className={`mt-2 text-xl font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>{settings.preferences.reducedMotion ? "Static" : "Animat"}</div>
                          <p className={`mt-2 text-sm ${mutedText}`}>Poți păstra mișcarea redusă dacă vrei o interfață mai calmă.</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <ToggleRow title="Reducere mișcare" description="Animații mai line și mai puține efecte pentru confort vizual." checked={settings.preferences.reducedMotion} onChange={(checked) => updatePreference("reducedMotion", checked)} />
                        <ToggleRow title="Contrast ridicat" description="Mai multă claritate pentru texte, separatoare și butoane." checked={settings.preferences.highContrast} onChange={(checked) => updatePreference("highContrast", checked)} />
                      </div>
                    </div>
                  </article>
                )}

                {activeSection === "notifications" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="Notificări" title="Ce primești și cât de des" description="Controlezi email-urile și alertele astfel încât să primești doar semnalele importante." />
                    <div className="space-y-3">
                      <ToggleRow title="Notificări prin email" description="Primești alerte pentru activități importante ale contului." checked={settings.preferences.emailNotifications} onChange={(checked) => updatePreference("emailNotifications", checked)} />
                      <ToggleRow title="Digest săptămânal" description="Rezumatul săptămânal al activității și progresului." checked={settings.preferences.weeklyDigest} onChange={(checked) => updatePreference("weeklyDigest", checked)} />
                      <ToggleRow title="Alerte de securitate" description="Schimbări de parolă, sesiuni și acțiuni sensibile." checked={settings.preferences.securityAlerts} onChange={(checked) => updatePreference("securityAlerts", checked)} />
                      <ToggleRow title="Noutăți despre produs" description="Actualizări despre funcții noi și zone noi din platformă." checked={settings.preferences.productUpdates} onChange={(checked) => updatePreference("productUpdates", checked)} />
                    </div>
                  </article>
                )}

                {activeSection === "privacy" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="Confidențialitate" title="Expunere și sesiune" description="Alegi cine îți vede profilul și cât timp rămâne sesiunea activă." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Vizibilitatea profilului</span>
                        <select value={settings.preferences.profileVisibility} onChange={(event) => updatePreference("profileVisibility", event.target.value as Preferences["profileVisibility"])} className={inputClass}>
                          {visibilityOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Timeout sesiune</span>
                        <input type="number" min={5} max={240} value={settings.preferences.sessionTimeoutMinutes} onChange={(event) => updatePreference("sessionTimeoutMinutes", Number(event.target.value))} className={inputClass} />
                      </label>
                    </div>
                    <div className="mt-4 space-y-3">
                      <ToggleRow title="Auto-save" description="Salvează modificările pe măsură ce lucrezi în cont." checked={settings.preferences.autoSave} onChange={(checked) => updatePreference("autoSave", checked)} />
                      <ToggleRow title="Sugestii contextuale" description="Afișează indicii utile și explicații în platformă." checked={settings.preferences.showHints} onChange={(checked) => updatePreference("showHints", checked)} />
                      <ToggleRow title="Focus mode" description="Ascunde elementele care pot distrage atenția." checked={settings.preferences.focusMode} onChange={(checked) => updatePreference("focusMode", checked)} />
                    </div>
                  </article>
                )}

                {activeSection === "productivity" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="Productivitate" title="Cum arată dashboard-ul pentru tine" description="Ajustezi modul de lucru, cardurile afișate și alți parametri de zi cu zi." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Mod de lucru</span>
                        <select value={settings.preferences.learningMode} onChange={(event) => updatePreference("learningMode", event.target.value as Preferences["learningMode"])} className={inputClass}>
                          {learningModeOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedText}`}>Carduri dashboard</span>
                        <select value={settings.preferences.dashboardCards} onChange={(event) => updatePreference("dashboardCards", event.target.value as Preferences["dashboardCards"])} className={inputClass}>
                          {dashboardCardOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-4 space-y-3">
                      <ToggleRow title="Prezentare inteligentă" description="Grupează recomandările și rezumatele într-un mod mai clar." checked={settings.preferences.smartSummaries} onChange={(checked) => updatePreference("smartSummaries", checked)} />
                      <ToggleRow title="Navigare compactă" description="Mai mult conținut pe ecran, spațiere redusă în navigație." checked={settings.preferences.compactNavigation} onChange={(checked) => updatePreference("compactNavigation", checked)} />
                    </div>
                  </article>
                )}

                {activeSection === "security" && (
                  <article className={`rounded-[2rem] border p-6 ${panelSoftClass}`}>
                    <SectionHeader eyebrow="Securitate" title="Cont, parolă și protecție" description="Tot ce ai nevoie ca să păstrezi contul în siguranță și să schimbi rapid parola." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                        <div className={`text-sm font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>Schimbare parolă</div>
                        <p className={`mt-2 text-sm leading-6 ${mutedText}`}>Poți redeschide fluxul dedicat de resetare pentru rolul tău în orice moment.</p>
                        <Link href={passwordResetPath} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100">
                          Deschide resetarea
                        </Link>
                      </div>
                      <div className={`rounded-[1.75rem] border p-4 ${panelSoftClass}`}>
                        <div className={`text-sm font-semibold ${isLight ? "text-[#0f172a]" : "text-white"}`}>Protecție activă</div>
                        <p className={`mt-2 text-sm leading-6 ${mutedText}`}>Datele de profil și preferințele sunt stocate separat, pe roluri, cu sincronizare backend.</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-cyan-200">
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Role aware</span>
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Sync backend</span>
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Persisted prefs</span>
                        </div>
                      </div>
                    </div>
                  </article>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => void saveSettings()} disabled={isSaving || isUploadingAvatar} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Se salvează..." : "Salvează tot"}
              </button>
              <button type="button" onClick={() => setTheme(settings.preferences.theme)} className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${isLight ? "border-black/10 bg-white text-[#111827] hover:bg-slate-100" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>
                Reaplică tema
              </button>
              <button type="button" onClick={() => setActiveSection("general")} className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${isLight ? "border-black/10 bg-white text-[#111827] hover:bg-slate-100" : "border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>
                Revino la General
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
