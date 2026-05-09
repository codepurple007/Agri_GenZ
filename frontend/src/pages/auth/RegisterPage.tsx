import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiFetch } from "@/api/client";
import type { AuthUser, UserRole } from "@/auth/types";
import { roleHome } from "@/auth/types";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredLocale } from "@/i18n/landing";
import type { Locale } from "@/i18n/landing";
import { authCopy } from "./authCopy";
import styles from "./AuthPages.module.css";

type StartRes = { ok: boolean; expiresAt: string; devOtp?: string };
type VerifyRes = {
  ok: boolean;
  token: string;
  user: AuthUser;
};

function detectLocale(): Locale {
  const s = getStoredLocale();
  return s === "am" ? "am" : "en";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const locale = detectLocale();
  const t = authCopy(locale);
  const rootClass = locale === "am" ? `${styles.root} lang-am` : styles.root;

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("farmer");
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onStart(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await apiFetch<StartRes>("/api/v1/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ phone, fullName, role }),
      });
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = await apiFetch<VerifyRes>("/api/v1/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      setSession(data.token, data.user);
      navigate(roleHome(data.user.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={rootClass}>
      <header className={styles.topBar}>
        <Link className={styles.homeCrumb} to="/">
          ← {t.homeLink}
        </Link>
        <Link className={styles.altLink} to="/login">
          {t.hasAccount}
        </Link>
      </header>

      <main className={styles.panel}>
        <h1 className={styles.title}>{t.registerTitle}</h1>

        {step === 1 ? (
          <form className={styles.form} onSubmit={onStart}>
            <label className={styles.label}>
              {t.phoneLabel}
              <input
                className={styles.input}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className={styles.hint}>{t.phoneHint}</span>
            </label>
            <label className={styles.label}>
              {t.fullName}
              <input
                className={styles.input}
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>{t.roleLabel}</legend>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="role"
                  checked={role === "farmer"}
                  onChange={() => setRole("farmer")}
                />
                {t.roleFarmer}
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="role"
                  checked={role === "extension_agent"}
                  onChange={() => setRole("extension_agent")}
                />
                {t.roleAgent}
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="role"
                  checked={role === "district_admin"}
                  onChange={() => setRole("district_admin")}
                />
                {t.roleAdmin}
              </label>
            </fieldset>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <button className={styles.submit} type="submit" disabled={pending}>
              {pending ? "…" : t.sendCode}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={onVerify}>
            <p className={styles.lead}>{t.otpHint}</p>
            {devOtp ? (
              <p className={styles.devBanner}>
                <strong>{t.devOtp}:</strong> {devOtp}
              </p>
            ) : null}
            <label className={styles.label}>
              {t.otpLabel}
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.row}>
              <button type="button" className={styles.secondary} onClick={() => setStep(1)} disabled={pending}>
                {t.back}
              </button>
              <button className={styles.submit} type="submit" disabled={pending}>
                {pending ? "…" : t.verify}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
