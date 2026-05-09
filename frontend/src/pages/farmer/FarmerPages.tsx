import { Link } from "react-router-dom";
import { getStoredLocale } from "@/i18n/landing";
import styles from "./FarmerPages.module.css";

function useAm() {
  return getStoredLocale() === "am";
}

export function FarmerDashboard() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "እንኳን ደህና መጡ" : "Welcome"}</h2>
      <p className={styles.lead}>
        {am
          ? "ከዚህ ዳሽቦርድ የአክስቴንሽን ምክር፣ የአየር ንብረት፣ ገበያ እና ሌሎችን ይድረሱ።"
          : "Use the tabs above to open advisory chat, weather alerts, markets, inputs, selling, messages, and your profile."}
      </p>
      <div className={styles.grid}>
        <Link className={styles.card} to="/farmer/advisory">
          <strong>{am ? "AI ምክር" : "AI advisory"}</strong>
          <span>{am ? "ጥያቄ ይላኩ — ችግር 1" : "Issue 1 — extension gap"}</span>
        </Link>
        <Link className={styles.card} to="/farmer/weather">
          <strong>{am ? "አየር / ማስጠንቀቂያ" : "Weather & alerts"}</strong>
          <span>{am ? "ችግር 2 — ሚዲያ" : "Issue 2 — media & alerts"}</span>
        </Link>
        <Link className={styles.card} to="/farmer/market">
          <strong>{am ? "ዋጋ / ምርት" : "Prices & produce"}</strong>
          <span>{am ? "ችግር 4 — ገበያ" : "Issue 4 — market linkage"}</span>
        </Link>
        <Link className={styles.card} to="/farmer/inputs">
          <strong>{am ? "ግብዓት ገበያ" : "Input marketplace"}</strong>
          <span>{am ? "ችግር 3 — ግብዓት" : "Issue 3 — inputs"}</span>
        </Link>
      </div>
    </section>
  );
}

export function FarmerAdvisoryPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "AI የአክስቴንሽን ምክር" : "AI advisory chatbot"}</h2>
      <p className={styles.p}>
        {am
          ? "ይህ ገጽ የችግር 1ን ይዟል፦ የአክስቴንሽን አገልግሎት ለማግኘት በአፕ አማካይነት ጥያቄ መላክ። ከዚህ በኋላ የውይይት UI እና የተመለከተ የኋይ ቋንቋ ይታከላል።"
          : "Addresses Issue 1: agronomic Q&A escalated to extension agents. Chat UI and offline queue will plug in here."}
      </p>
    </section>
  );
}

export function FarmerWeatherPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "አየር እና አስቸኳይ ማስጠንቀቂያዎች" : "Weather & emergency alerts"}</h2>
      <p className={styles.p}>
        {am
          ? "ችግር 2፦ የአየር ትንበያ፣ የስርየት ማስጠንቀቂያ እና የገበያ ዋጋ አጠቃላይ። የSMS / ግፋ ማስተናገጃ ከዚህ ጋር ይገናኛል።"
          : "Issue 2: forecasts, pest warnings, and bulletin-friendly summaries. SMS preferences live under Settings."}
      </p>
    </section>
  );
}

export function FarmerMarketPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "የገበያ ዋጋ እና ምርት ማስታወቂያ" : "Market prices & produce listing"}</h2>
      <p className={styles.p}>
        {am
          ? "ችግር 4፦ በአቅራቢያዎ የስንዴ/ጤፍ/በቆሎ ዋጋ፣ ምርት ማስታወቂያ እና ከገዢዎች ጋር ግንኙነት።"
          : "Issue 4: live commodity panels plus listing crop type, quantity, and harvest window."}
      </p>
    </section>
  );
}

export function FarmerInputsPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "የግብዓት ገበያ (ቅድመ ትዕዛዝ)" : "Input marketplace & pre-order"}</h2>
      <p className={styles.p}>
        {am
          ? "ችግር 3፦ አክሮ ዴለር፣ ክምችት እና ቅድመ ትዕዛዝ። የዝቅተኛ ክምችት ማስጠንቀቂያዎች በSMS።"
          : "Issue 3: dealer directory, stock signals, and seasonal pre-orders for seed & fertilizer."}
      </p>
    </section>
  );
}

export function FarmerSalesPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "ገዢ ማገናኘት እና ትራንስፖርት" : "Buyer matching & transport"}</h2>
      <p className={styles.p}>
        {am
          ? "ችግር 4/5፦ ከተማ ገዢዎች፣ ማረጋገጫ እና ለመስመር ማስተናገጃ።"
          : "Issue 4/5: verified buyers/cooperatives plus logistics hooks so farmers avoid costly trips."}
      </p>
    </section>
  );
}

export function FarmerMessagesPage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "መልዕክት ሳጥን" : "Messaging inbox"}</h2>
      <p className={styles.p}>
        {am ? "ከአክስቴንሽን እና ከገዢዎች መልዕክቶች።" : "Threads with agents, buyers, and system notices."}
      </p>
    </section>
  );
}

export function FarmerProfilePage() {
  const am = useAm();
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>{am ? "መገለጫ" : "Profile"}</h2>
      <p className={styles.p}>
        {am ? "ስም፣ ቁጥር፣ የአፍር አይነት እና ቋንቋ።" : "Crop mix, farm location, language — editable profile fields land here."}
      </p>
    </section>
  );
}
