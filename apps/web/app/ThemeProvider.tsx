"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  return storedTheme === "light" ? "light" : "dark";
}

function subscribeThemeChange(callback: () => void) {
  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener("themechange", handler as EventListener);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("themechange", handler as EventListener);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeThemeChange, getStoredTheme, () => "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    window.dispatchEvent(new Event("themechange"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
