import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import type { Locale } from "@/i18n/landing";
import { getStoredLocale, landingCopy, storeLocale } from "@/i18n/landing";
import { persistLanguage } from "@/i18n/locale";
import styles from "./LandingPage.module.css";

type LandingApiPayload = {
  ussdCodePlaceholder?: string;
  partnerMessage?: string;
  updatedAt?: string;
};

function detectLocale(): Locale {
  const stored = getStoredLocale();
  if (stored) return stored;
  const nav = navigator.language?.toLowerCase() ?? "en";
  if (nav.startsWith("am")) return "am";
  if (nav.startsWith("om")) return "om";
  return "en";
}

/**
 * Landing — first screen: language switching, USSD guidance, entry to staff login.
 */
export function LandingPage() {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const [apiLanding, setApiLanding] = useState<LandingApiPayload | null>(null);

  useEffect(() => {
    persistLanguage(locale);
    storeLocale(locale);
  }, [locale]);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch<LandingApiPayload>("/api/v1/landing", { signal: ac.signal })
      .then((data) => {
        if (data && typeof data === "object") setApiLanding(data);
      })
      .catch(() => {
        /* offline or API down — static copy still works */
      });
    return () => ac.abort();
  }, []);

  const t = landingCopy[locale];
  const rootClass =
    locale === "am" ? `${styles.root} lang-am` : locale === "om" ? `${styles.root} lang-om` : styles.root;

  const steps = useMemo(
    () => [t.ussdStep1, t.ussdStep2, t.ussdStep3],
    [t.ussdStep1, t.ussdStep2, t.ussdStep3],
  );

  const suffix =
    locale === "am"
      ? t.ussdCodeHintSuffix
      : locale === "om"
        ? " — odeeffannoon qajeelfamaan kee isa barsiisi."
        : " — ask your service provider for the active code.";

  return (
    <div className={rootClass}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoSlot} aria-hidden>
            <AgriServiceLogo size={36} />
          </span>
          <span className={styles.appName}>{t.appName}</span>
        </div>
        <div className={styles.lang} role="group" aria-label={t.chooseLanguage}>
          <span className="visually-hidden">{t.chooseLanguage}</span>
          <button
            type="button"
            className={locale === "en" ? styles.langActive : styles.langBtn}
            onClick={() => setLocale("en")}
            aria-pressed={locale === "en"}
          >
            {t.langEnglish}
          </button>
          <button
            type="button"
            className={locale === "am" ? styles.langActive : styles.langBtn}
            onClick={() => setLocale("am")}
            aria-pressed={locale === "am"}
          >
            {t.langAmharic}
          </button>
          <button
            type="button"
            className={locale === "om" ? styles.langActive : styles.langBtn}
            onClick={() => setLocale("om")}
            aria-pressed={locale === "om"}
          >
            {t.langOromoo}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <p className={styles.badge}>{t.heroBadge}</p>
          <h1 id="hero-title" className={styles.title}>
            {t.tagline}
          </h1>
          <div className={styles.ctaRow}>
            <Link className={styles.btnPrimary} to="/login">
              {t.secondaryCta}
            </Link>
            <Link className={styles.btnSecondary} to="/farmer/register">
              {t.smsRegisterCta}
            </Link>
            <a className={styles.btnSecondary} href="#ussd-help">
              {t.ussdStepsTitle}
            </a>
          </div>
          <p className={styles.hint}>{t.offlineNote}</p>
        </section>

        <section className={styles.card} id="ussd-help" aria-labelledby="ussd-title">
          <h2 id="ussd-title" className={styles.cardTitle}>
            {t.ussdTitle}
          </h2>
          <p className={styles.cardLead}>{t.ussdLead}</p>
          <h3 className={styles.stepsHeading}>{t.ussdStepsTitle}</h3>
          <ol className={styles.steps}>
            {steps.map((text, i) => (
              <li key={i} className={styles.stepItem}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className={styles.note} role="note">
            {t.ussdNote}
          </p>
          {apiLanding?.ussdCodePlaceholder ? (
            <p className={styles.apiHint}>
              <span className={styles.mono}>{apiLanding.ussdCodePlaceholder}</span>
              {suffix}
            </p>
          ) : null}
        </section>
      </main>

      <footer className={styles.footer}>
        <span>{t.footer}</span>
      </footer>
    </div>
  );
}
