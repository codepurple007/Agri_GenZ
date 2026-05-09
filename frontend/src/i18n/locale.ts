/** Supported UI languages (i18next resource keys). */
import i18n from "@/i18n/i18n";

export type AppLang = "en" | "am" | "om";

export function persistLanguage(lng: AppLang): void {
  void i18n.changeLanguage(lng);
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLangFromLocale(lng);
  }
  try {
    localStorage.setItem("i18nextLng", lng);
    localStorage.setItem("agri_genz_locale", lng);
  } catch {
    /* ignore */
  }
}

export function normalizeAppLang(i18nLanguage: string | undefined): AppLang {
  const l = (i18nLanguage ?? "en").toLowerCase();
  if (l.startsWith("am")) return "am";
  if (l.startsWith("om")) return "om";
  return "en";
}

export function htmlLangFromLocale(locale: AppLang): string {
  if (locale === "am") return "am";
  if (locale === "om") return "om";
  return "en";
}
