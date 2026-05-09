import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredLocale } from "@/i18n/landing";
import styles from "./FarmerLayout.module.css";

const links = [
  { to: "/farmer", labelEn: "Home", labelAm: "መነሻ", end: true },
  { to: "/farmer/advisory", labelEn: "AI help", labelAm: "AI ምክር", end: false },
  { to: "/farmer/weather", labelEn: "Weather", labelAm: "አየር", end: false },
  { to: "/farmer/market", labelEn: "Prices", labelAm: "ገበያ", end: false },
  { to: "/farmer/inputs", labelEn: "Inputs", labelAm: "ግብዓት", end: false },
  { to: "/farmer/sales", labelEn: "Sell", labelAm: "ሽያጭ", end: false },
  { to: "/farmer/messages", labelEn: "Inbox", labelAm: "መልዕክት", end: false },
  { to: "/farmer/profile", labelEn: "Profile", labelAm: "መገለጫ", end: false },
];

export function FarmerLayout() {
  const { user, logout } = useAuth();
  const am = getStoredLocale() === "am";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{am ? "ገበሬ ፖርታል" : "Farmer portal"}</p>
          <p className={styles.userLine}>
            {user?.fullName ?? ""}{" "}
            <span className={styles.muted}>({user?.phone})</span>
          </p>
        </div>
        <div className={styles.headerActions}>
          <NavLink className={({ isActive }) => (isActive ? styles.settingsOn : styles.settings)} to="/settings">
            {am ? "ቅንብሮች" : "Settings"}
          </NavLink>
          <button type="button" className={styles.logout} onClick={() => logout()}>
            {am ? "ውጣ" : "Log out"}
          </button>
        </div>
      </header>

      <nav className={styles.subNav} aria-label={am ? "ዋና ምናሌ" : "Farmer sections"}>
        <div className={styles.subNavInner}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? styles.subLinkActive : styles.subLink)}
            >
              {am ? l.labelAm : l.labelEn}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
