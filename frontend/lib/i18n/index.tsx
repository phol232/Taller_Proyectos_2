"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Locale, TranslationDictionary } from "./types";
import { es } from "./es";
import { en } from "./en";

const dictionaries: Record<Locale, TranslationDictionary> = { es, en };

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationDictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "planner-uc-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "es" || saved === "en") return saved;
  return "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  // Prevent hydration mismatch — always render with "es" on server
  const value: I18nContextValue = {
    locale: mounted ? locale : "es",
    setLocale,
    t: dictionaries[mounted ? locale : "es"],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
