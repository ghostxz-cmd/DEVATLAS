"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "dark" | "light";

type AccentColor = "cyan" | "emerald" | "amber" | "rose" | "violet";
type Density = "comfortable" | "compact" | "spacious";
type Language = "ro" | "en";
type ProfileVisibility = "private" | "public";
type LearningMode = "balanced" | "focused" | "accelerated";
type DashboardCards = "all" | "compact";

type Preferences = {
  theme: Theme;
  language: Language;
  accentColor: AccentColor;
  density: Density;
  reducedMotion: boolean;
  highContrast: boolean;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  profileVisibility: ProfileVisibility;
  learningMode: LearningMode;
  autoSave: boolean;
  compactNavigation: boolean;
  showHints: boolean;
  sessionTimeoutMinutes: number;
  dashboardCards: DashboardCards;
  smartSummaries: boolean;
  focusMode: boolean;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";
const PREFERENCES_STORAGE_KEY = "devatlas_preferences";

const DEFAULT_PREFERENCES: Preferences = {
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

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  return storedTheme === "light" ? "light" : "dark";
}

function getStoredPreferences(): Preferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const rawPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
  if (rawPreferences) {
    try {
      const parsed = JSON.parse(rawPreferences) as Partial<Preferences>;
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        theme: parsed.theme === "light" ? "light" : "dark",
        language: parsed.language === "en" ? "en" : "ro",
        accentColor: ["cyan", "emerald", "amber", "rose", "violet"].includes(parsed.accentColor ?? "")
          ? (parsed.accentColor as AccentColor)
          : DEFAULT_PREFERENCES.accentColor,
        density: ["comfortable", "compact", "spacious"].includes(parsed.density ?? "")
          ? (parsed.density as Density)
          : DEFAULT_PREFERENCES.density,
        reducedMotion: Boolean(parsed.reducedMotion),
        highContrast: Boolean(parsed.highContrast),
        emailNotifications: Boolean(parsed.emailNotifications ?? DEFAULT_PREFERENCES.emailNotifications),
        weeklyDigest: Boolean(parsed.weeklyDigest ?? DEFAULT_PREFERENCES.weeklyDigest),
        securityAlerts: Boolean(parsed.securityAlerts ?? DEFAULT_PREFERENCES.securityAlerts),
        productUpdates: Boolean(parsed.productUpdates ?? DEFAULT_PREFERENCES.productUpdates),
        profileVisibility: parsed.profileVisibility === "public" ? "public" : "private",
        learningMode: parsed.learningMode === "focused" || parsed.learningMode === "accelerated" ? parsed.learningMode : "balanced",
        autoSave: Boolean(parsed.autoSave ?? DEFAULT_PREFERENCES.autoSave),
        compactNavigation: Boolean(parsed.compactNavigation ?? DEFAULT_PREFERENCES.compactNavigation),
        showHints: Boolean(parsed.showHints ?? DEFAULT_PREFERENCES.showHints),
        sessionTimeoutMinutes: typeof parsed.sessionTimeoutMinutes === "number" ? parsed.sessionTimeoutMinutes : DEFAULT_PREFERENCES.sessionTimeoutMinutes,
        dashboardCards: parsed.dashboardCards === "compact" ? "compact" : "all",
        smartSummaries: Boolean(parsed.smartSummaries ?? DEFAULT_PREFERENCES.smartSummaries),
        focusMode: Boolean(parsed.focusMode ?? DEFAULT_PREFERENCES.focusMode),
      };
    } catch {
      // fall through to legacy theme storage
    }
  }

  return {
    ...DEFAULT_PREFERENCES,
    theme: getStoredTheme(),
  };
}

function samePreferences(left: Preferences, right: Preferences) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<Preferences>(() => getStoredPreferences());
  const theme: Theme = preferences.theme;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromStorage = () => {
      const nextPreferences = getStoredPreferences();
      setPreferencesState((current) => (samePreferences(current, nextPreferences) ? current : nextPreferences));
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("themechange", syncFromStorage as EventListener);
    window.addEventListener("preferenceschange", syncFromStorage as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("themechange", syncFromStorage as EventListener);
      window.removeEventListener("preferenceschange", syncFromStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.dataset.theme = theme;
    root.dataset.accent = preferences.accentColor;
    root.dataset.density = preferences.density;
    root.dataset.reducedMotion = preferences.reducedMotion ? "true" : "false";
    root.dataset.highContrast = preferences.highContrast ? "true" : "false";
    root.lang = preferences.language;

    document.body.style.accentColor =
      preferences.accentColor === "emerald"
        ? "#22c55e"
        : preferences.accentColor === "amber"
          ? "#f59e0b"
          : preferences.accentColor === "rose"
            ? "#f43f5e"
            : preferences.accentColor === "violet"
              ? "#8b5cf6"
              : "#22d3ee";
  }, [preferences, theme]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const nextPreferences: Preferences = { ...preferences, theme: newTheme };
    setPreferencesState(nextPreferences);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
    window.dispatchEvent(new Event("themechange"));
    window.dispatchEvent(new Event("preferenceschange"));
  };

  const setTheme = (nextTheme: Theme) => {
    const nextPreferences: Preferences = { ...preferences, theme: nextTheme };
    setPreferencesState(nextPreferences);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
    window.dispatchEvent(new Event("themechange"));
    window.dispatchEvent(new Event("preferenceschange"));
  };

  const setPreferences = (nextPreferences: Preferences) => {
    setPreferencesState(nextPreferences);
    localStorage.setItem(THEME_STORAGE_KEY, nextPreferences.theme);
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
    window.dispatchEvent(new Event("themechange"));
    window.dispatchEvent(new Event("preferenceschange"));
  };

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const nextPreferences: Preferences = { ...preferences, [key]: value };
    setPreferences(nextPreferences);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, preferences, setPreferences, updatePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
