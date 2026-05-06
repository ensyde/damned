"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { ThemeConfig } from "@damned/shared";

const ThemeContext = createContext<ThemeConfig | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    apiGet<ThemeConfig>("/theme/active")
      .then((t) => {
        setTheme(t);
        applyTheme(t);
      })
      .catch(() => undefined);
  }, []);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primaryColor);
  root.style.setProperty("--color-accent", theme.accentColor);
  root.style.setProperty("--color-bg", theme.bgColor);
  root.style.setProperty("--color-surface", theme.surfaceColor);
  root.style.setProperty("--color-text", theme.textColor);
  root.style.setProperty("--font-family", theme.fontFamily);
  root.style.setProperty("--border-radius", theme.borderRadius);
}

export function useTheme() {
  return useContext(ThemeContext);
}
