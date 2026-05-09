import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredLocale } from "@/i18n/landing";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { logout } = useAuth();
  const am = getStoredLocale() === "am";

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{am ? "ቅንብሮች" : "Settings"}</h1>
      </header>
      <main className={styles.main}>
        <section className={styles.card}>
          <h2 className={styles.h2}>{am ? "SMS ምርጫዎች" : "SMS preferences"}</h2>
          <p className={styles.p}>
            {am
              ? "የአየር ማስጠንቀቂያ፣ የገበያ ዋጋ እና የOTP ምልክቶች። (የተያያዙ ቅንብሮች በቀጣይ።)"
              : "Toggle weather bulletins, price digests, and OTP notices — wiring comes with notification service."}
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.h2}>{am ? "ኦፍላይን ካሽ" : "Offline cache"}</h2>
          <p className={styles.p}>
            {am
              ? "የቅርብ ጊዜ ምክሮች እና ዋጋዎች በስልክ ላይ ማቆየት።"
              : "Manage cached advisories and price snapshots for low-connectivity sessions."}
          </p>
        </section>
        <button type="button" className={styles.danger} onClick={() => logout()}>
          {am ? "ውጣ" : "Log out"}
        </button>
        <Link className={styles.link} to="/">
          {am ? "ወደ መነሻ" : "Back to home"}
        </Link>
      </main>
    </div>
  );
}
