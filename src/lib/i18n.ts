import en from "../../public/locales/en.json";
import id from "../../public/locales/id.json";
import es from "../../public/locales/es.json";

export type SupportedLocale = "en" | "id" | "es";

export const translations: Record<SupportedLocale, Record<string, string>> = {
  en,
  id,
  es,
};

let currentLocale: SupportedLocale = (typeof localStorage !== "undefined" && (localStorage.getItem("xatwoot_lang") as SupportedLocale)) || "en";

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function setLocale(lang: SupportedLocale) {
  currentLocale = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("xatwoot_lang", lang);
  }
}

export function t(key: string, fallback?: string): string {
  const dict = translations[currentLocale] ?? translations.en;
  return dict[key] ?? fallback ?? key;
}

/** Automatically detect browser language */
export function detectBrowserLanguage(): SupportedLocale {
  if (typeof navigator === "undefined" || !navigator.language) return "en";
  const lang = navigator.language.slice(0, 2).toLowerCase();
  if (lang === "id") return "id";
  if (lang === "es") return "es";
  return "en";
}
