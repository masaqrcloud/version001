"use client";

import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${className}`}
      dir="ltr"
      role="group"
      aria-label={t("language")}
    >
      {LOCALES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setLocale(id)}
          className={`min-h-8 rounded-full px-2.5 text-xs font-semibold ${
            locale === id
              ? "bg-[var(--ink)] text-[var(--bg)]"
              : "bg-black/5 text-[var(--ink)]"
          }`}
        >
          {LOCALE_META[id].short}
        </button>
      ))}
    </div>
  );
}
