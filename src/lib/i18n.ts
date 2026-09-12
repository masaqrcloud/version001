export const LOCALES = ["tr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_META: Record<
  Locale,
  { short: string; name: string; dir: "ltr" | "rtl"; date: string }
> = {
  tr: { short: "TR", name: "Türkçe", dir: "ltr", date: "tr-TR" },
  en: { short: "EN", name: "English", dir: "ltr", date: "en-GB" },
};

export const LOCALE_STORAGE_KEY = "masaqr.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] == null ? "" : String(vars[key]),
  );
}
