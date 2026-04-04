"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type AccountSettings = {
  profile: {
    fullName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    role: string;
  };
  preferences: Preferences;
};

type SettingsState = AccountSettings & {
  passwordHint: string;
};

const sectionLinks = [
  { href: "#profil", label: "Profil" },
  { href: "#vizual", label: "Apariție" },
  { href: "#notificari", label: "Notificări" },
  { href: "#confidentialitate", label: "Confidențialitate" },
  { href: "#productivitate", label: "Productivitate" },
  { href: "#securitate", label: "Securitate" },
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

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeThemeBadge(theme: Preferences["theme"]) {
  return theme === "light" ? "Mod luminos" : "Mod întunecat";
}

function mergePreferences(preferences?: Partial<Preferences> | null): Preferences {
  return {
    ...preferenceDefaults,
    ...(preferences ?? {}),
  };
}

function applyTheme(theme: Preferences["theme"]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("theme", theme);
  window.dispatchEvent(new Event("themechange"));
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
    <label className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

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

      const payload = (await response.json()) as {
        profile: AccountSettings["profile"];
        preferences: Partial<Preferences>;
      };

      const mergedPreferences = mergePreferences(payload.preferences);
      setSettings({
        profile: payload.profile,
        preferences: mergedPreferences,
        passwordHint: payload.profile.role === "ADMIN" ? "Autentificare admin" : "Schimbare parolă în siguranță",
      });
      applyTheme(mergedPreferences.theme);
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    void loadSettings().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load settings.");
      setIsLoading(false);
    });
  }, []);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setSettings((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [key]: value,
      },
    }));

    if (key === "theme") {
      applyTheme(value as Preferences["theme"]);
    }
  };

  const updateProfile = <K extends keyof SettingsState["profile"]>(key: K, value: SettingsState["profile"][K]) => {
    setSettings((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
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

      applyTheme(settings.preferences.theme);
      setSuccessMessage("Setările au fost salvate și sincronizate.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nu am putut salva setările.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
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

  const profileLabel = settings.profile.role === "ADMIN" ? "Administrator" : settings.profile.role === "INSTRUCTOR" ? "Profesor" : "Elev";
  const initials = (settings.profile.fullName?.trim().charAt(0) || settings.profile.email?.charAt(0) || "U").toUpperCase();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-24 -z-0 flex justify-center pointer-events-none">
        <div className="h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-7xl relative z-10">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute -right-24 top-0 h-72 w-72 bg-white/10 opacity-20 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[280px_1fr]">
            <aside className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold text-black">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{settings.profile.fullName}</div>
                  <div className="truncate text-xs text-gray-400">{settings.profile.email}</div>
                  <div className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    {profileLabel}
                  </div>
                </div>
              </div>

              <nav className="mt-6 space-y-1">
                {sectionLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-2xl px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Scurtături</div>
                <div className="mt-4 space-y-2 text-sm text-gray-300">
                  <Link href={passwordResetPath} className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10 hover:text-white">
                    Schimbă parola
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-left font-medium text-red-200 transition hover:bg-red-500/15"
                  >
                    Ieși din cont
                  </button>
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Tema curentă</div>
                  <div className="mt-2 text-xl font-semibold text-white">{normalizeThemeBadge(settings.preferences.theme)}</div>
                  <p className="mt-2 text-sm text-gray-400">Se sincronizează instant cu browserul și contul.</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Timeout sesiune</div>
                  <div className="mt-2 text-xl font-semibold text-white">{settings.preferences.sessionTimeoutMinutes} min</div>
                  <p className="mt-2 text-sm text-gray-400">Control pentru cât de repede expiră sesiunea.</p>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Stare cont</div>
                  <div className="mt-2 text-xl font-semibold text-white">{settings.passwordHint || "Pregătit"}</div>
                  <p className="mt-2 text-sm text-gray-400">Cont separat, preferințe separate, flux separat pe rol.</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                  Setări avansate cont
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.94] sm:text-5xl lg:text-7xl">
                  Un hub de cont care arată și se simte ca restul DevAtlas.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 sm:text-base">
                  Profil, teme, notificări și preferințe de lucru, toate așezate în secțiuni clare, cu spațiere mare și look grafic. Exact aceeași energie vizuală ca pagina principală.
                </p>

                {errorMessage && (
                  <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {successMessage}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void saveSettings()}
                    disabled={isSaving}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Se salvează..." : "Salvează setările"}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTheme(settings.preferences.theme)}
                    className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Aplică tema
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <article id="profil" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Profil"
                    title="Gestionare identitate și date"
                    description="Actualizează numele, avatarul și zona orară. Se salvează separat pentru rolul tău și se sincronizează cu contul principal."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Nume complet</span>
                      <input
                        value={settings.profile.fullName}
                        onChange={(event) => updateProfile("fullName", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
                        placeholder="Nume și prenume"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Avatar URL</span>
                      <input
                        value={settings.profile.avatarUrl ?? ""}
                        onChange={(event) => updateProfile("avatarUrl", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
                        placeholder="https://..."
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Email</span>
                      <input value={settings.profile.email} readOnly className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300 outline-none" />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Timezone</span>
                      <input
                        value={settings.profile.timezone ?? ""}
                        onChange={(event) => updateProfile("timezone", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
                        placeholder="Europe/Bucharest"
                      />
                    </label>
                  </div>
                </article>

                <article id="vizual" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Apariție"
                    title="Temă, densitate, accent"
                    description="Controlezi stilul vizual și experiența de citire. Exact tipul de setări pe care le-ai cere într-un produs bine făcut."
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updatePreference("theme", "dark")}
                      className={`rounded-3xl border px-4 py-4 text-left transition ${settings.preferences.theme === "dark" ? "border-cyan-400/50 bg-cyan-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className="text-sm font-semibold text-white">Temă întunecată</div>
                      <div className="mt-1 text-xs text-gray-400">Contrast puternic și focus pe conținut.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePreference("theme", "light")}
                      className={`rounded-3xl border px-4 py-4 text-left transition ${settings.preferences.theme === "light" ? "border-cyan-400/50 bg-cyan-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className="text-sm font-semibold text-white">Temă luminoasă</div>
                      <div className="mt-1 text-xs text-gray-400">Pentru o interfață mai aerisită.</div>
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Accent</span>
                      <select
                        value={settings.preferences.accentColor}
                        onChange={(event) => updatePreference("accentColor", event.target.value as Preferences["accentColor"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {accentOptions.map((accent) => (
                          <option key={accent} value={accent} className="bg-black text-white">
                            {accent}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Densitate</span>
                      <select
                        value={settings.preferences.density}
                        onChange={(event) => updatePreference("density", event.target.value as Preferences["density"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {densityOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-black text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Limbă</span>
                      <select
                        value={settings.preferences.language}
                        onChange={(event) => updatePreference("language", event.target.value as Preferences["language"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {languageOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-black text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 space-y-3">
                    <ToggleRow
                      title="Reducere mișcare"
                      description="Animații mai line și mai puține efecte pentru confort vizual."
                      checked={settings.preferences.reducedMotion}
                      onChange={(checked) => updatePreference("reducedMotion", checked)}
                    />
                    <ToggleRow
                      title="Contrast ridicat"
                      description="Mai multă claritate pentru texte, separatoare și butoane."
                      checked={settings.preferences.highContrast}
                      onChange={(checked) => updatePreference("highContrast", checked)}
                    />
                  </div>
                </article>

                <article id="notificari" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Notificări"
                    title="Ce primești și cât de des"
                    description="Controlează email-urile și alertele astfel încât să primești doar semnalele importante."
                  />

                  <div className="space-y-3">
                    <ToggleRow
                      title="Notificări prin email"
                      description="Primești alerte pentru activități importante ale contului."
                      checked={settings.preferences.emailNotifications}
                      onChange={(checked) => updatePreference("emailNotifications", checked)}
                    />
                    <ToggleRow
                      title="Digest săptămânal"
                      description="Rezumatul săptămânal al activității și progresului."
                      checked={settings.preferences.weeklyDigest}
                      onChange={(checked) => updatePreference("weeklyDigest", checked)}
                    />
                    <ToggleRow
                      title="Alerte de securitate"
                      description="Schimbări de parolă, sesiuni și acțiuni sensibile."
                      checked={settings.preferences.securityAlerts}
                      onChange={(checked) => updatePreference("securityAlerts", checked)}
                    />
                    <ToggleRow
                      title="Noutăți despre produs"
                      description="Actualizări despre funcții noi și zone noi din platformă."
                      checked={settings.preferences.productUpdates}
                      onChange={(checked) => updatePreference("productUpdates", checked)}
                    />
                  </div>
                </article>

                <article id="confidentialitate" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Confidențialitate"
                    title="Expunere și sesiune"
                    description="Alegi cine îți vede profilul și cât timp rămâne sesiunea activă."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Vizibilitatea profilului</span>
                      <select
                        value={settings.preferences.profileVisibility}
                        onChange={(event) => updatePreference("profileVisibility", event.target.value as Preferences["profileVisibility"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {visibilityOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-black text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Timeout sesiune</span>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        value={settings.preferences.sessionTimeoutMinutes}
                        onChange={(event) => updatePreference("sessionTimeoutMinutes", Number(event.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      />
                    </label>
                  </div>

                  <div className="mt-4 space-y-3">
                    <ToggleRow
                      title="Auto-save"
                      description="Salvează modificările pe măsură ce lucrezi în cont."
                      checked={settings.preferences.autoSave}
                      onChange={(checked) => updatePreference("autoSave", checked)}
                    />
                    <ToggleRow
                      title="Sugestii contextuale"
                      description="Afișează indicii utile și explicații în platformă."
                      checked={settings.preferences.showHints}
                      onChange={(checked) => updatePreference("showHints", checked)}
                    />
                    <ToggleRow
                      title="Focus mode"
                      description="Ascunde elementele care pot distrage atenția."
                      checked={settings.preferences.focusMode}
                      onChange={(checked) => updatePreference("focusMode", checked)}
                    />
                  </div>
                </article>

                <article id="productivitate" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Productivitate"
                    title="Cum arată dashboard-ul pentru tine"
                    description="Ajustezi modul de lucru, cardurile afișate și alți parametri de zi cu zi."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Mod de lucru</span>
                      <select
                        value={settings.preferences.learningMode}
                        onChange={(event) => updatePreference("learningMode", event.target.value as Preferences["learningMode"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {learningModeOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-black text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Carduri dashboard</span>
                      <select
                        value={settings.preferences.dashboardCards}
                        onChange={(event) => updatePreference("dashboardCards", event.target.value as Preferences["dashboardCards"])}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                      >
                        {dashboardCardOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-black text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 space-y-3">
                    <ToggleRow
                      title="Prezentare inteligentă"
                      description="Grupează recomandările și rezumatele într-un mod mai clar."
                      checked={settings.preferences.smartSummaries}
                      onChange={(checked) => updatePreference("smartSummaries", checked)}
                    />
                    <ToggleRow
                      title="Navigare compactă"
                      description="Mai mult conținut pe ecran, spațiere redusă în navigație."
                      checked={settings.preferences.compactNavigation}
                      onChange={(checked) => updatePreference("compactNavigation", checked)}
                    />
                  </div>
                </article>

                <article id="securitate" className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                  <SectionHeader
                    eyebrow="Securitate"
                    title="Cont, parolă și protecție"
                    description="Tot ce ai nevoie ca să păstrezi contul în siguranță și să schimbi rapid parola.
                    "
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Schimbare parolă</div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">Poți redeschide fluxul dedicat de resetare pentru rolul tău în orice moment.</p>
                      <Link href={passwordResetPath} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100">
                        Deschide resetarea
                      </Link>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Protecție activă</div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">Datele de profil și preferințele sunt stocate separat, pe roluri, cu sincronizare backend.</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-cyan-200">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Role aware</span>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Sync backend</span>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Persisted prefs</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
