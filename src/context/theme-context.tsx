"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const THEME_COLORS = {
  light: "#ffffff",
  dark: "#030712",
} as const;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Dynamically updates the <meta name="theme-color"> tag so Android Chrome / PWA
 * status bar and navigation bar always match the current app theme.
 */
function syncThemeColorMeta(theme: Theme) {
  const color = THEME_COLORS[theme];

  // Update existing theme-color meta tags
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length > 0) {
    metas.forEach((meta) => {
      meta.setAttribute("content", color);
      // Remove media attribute so the single color applies universally at runtime
      meta.removeAttribute("media");
    });
  } else {
    // Create one if none exists
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Default to light mode unless user explicitly set dark mode in localStorage
    const savedTheme = localStorage.getItem("schoolstudy_theme") as Theme | null;
    const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";

    setThemeState(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Sync Android system bar color on mount
    syncThemeColorMeta(initialTheme);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("schoolstudy_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Sync Android system bar color on theme change
    syncThemeColorMeta(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
