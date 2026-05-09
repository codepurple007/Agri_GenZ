import { getStoredLocale } from "@/i18n/landing";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./PortalPages.module.css";

function am() {
  return getStoredLocale() === "am";
}

export function AgentDashboard() {
  const a = am();
  const { user, logout } = useAuth();
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{a ? "የአክስቴንሽን ወኪል" : "Extension agent portal"}</p>
          <h1 className={styles.h1}>{user?.fullName}</h1>
        </div>
        <button type="button" className={styles.logout} onClick={() => logout()}>
          {a ? "ውጣ" : "Log out"}
        </button>
      </header>
      <section className={styles.section}>
        <h2 className={styles.h2}>{a ? "ዳሽቦርድ" : "Dashboard"}</h2>
        <p className={styles.p}>
          {a
            ? "የገበሬ መዝገብ፣ የፊልድ ጉብኝት መርሃ ግብር፣ ከAI የተላኩ ጥያቄዎች፣ ለገበሬዎች ድብልቅ መልዕክት።"
            : "Assigned farmers, field visit schedule, AI-escalated questions, and bulk SMS — full UI next pass."}
        </p>
        <ul className={styles.list}>
          <li>{a ? "የእርስዎ ገበሬዎች" : "Your assigned farmers (list view)"}</li>
          <li>{a ? "ቀጣይ ጉብኝቶች" : "Upcoming visits & routes"}</li>
          <li>{a ? "AI ከፍታ ጥያቄዎች" : "Open escalations from the chatbot"}</li>
        </ul>
      </section>
    </div>
  );
}

export function AdminDashboard() {
  const a = am();
  const { user, logout } = useAuth();
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{a ? "የዲስትሪክት አስተዳዳሪ" : "District admin"}</p>
          <h1 className={styles.h1}>{user?.fullName}</h1>
        </div>
        <button type="button" className={styles.logout} onClick={() => logout()}>
          {a ? "ውጣ" : "Log out"}
        </button>
      </header>
      <section className={styles.section}>
        <h2 className={styles.h2}>{a ? "አገልግሎት ሽፋን" : "Service coverage"}</h2>
        <p className={styles.p}>
          {a
            ? "የ60 ቀናት ሙሴ ካልታየ ኬበሌ ሙቀት ካርታ፣ መንገድ ዕቅድ፣ ሪፖርቶች።"
            : "Heat map of kebeles with no visit in 60+ days, routing tools, downloadable coverage reports."}
        </p>
      </section>
    </div>
  );
}
