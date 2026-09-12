"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  interpolate,
  isLocale,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n";
import { GUEST_MESSAGES, type GuestMessage } from "@/lib/i18n-guest";

type LocaleApi = {
  locale: Locale;
  dir: "ltr" | "rtl";
  dateLocale: string;
  setLocale: (next: Locale) => void;
  t: (key: GuestMessage, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleApi | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "tr";
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : "tr";
  });

  useEffect(() => {
    const html = document.documentElement;
    const meta = LOCALE_META[locale];
    html.lang = locale;
    html.dir = meta.dir;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    return () => {
      html.lang = "tr";
      html.dir = "ltr";
    };
  }, [locale]);

  const value = useMemo<LocaleApi>(() => {
    const dict = GUEST_MESSAGES[locale];
    return {
      locale,
      dir: LOCALE_META[locale].dir,
      dateLocale: LOCALE_META[locale].date,
      setLocale: setLocaleState,
      t: (key, vars) => interpolate(dict[key] ?? GUEST_MESSAGES.tr[key], vars),
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return ctx;
}

export function useLocaleOptional() {
  return useContext(LocaleContext);
}
