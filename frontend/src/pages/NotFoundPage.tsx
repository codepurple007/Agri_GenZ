import { Link } from "react-router-dom";
import { getStoredLocale } from "@/i18n/landing";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  const am = getStoredLocale() === "am";

  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{am ? "ገጹ አልተገኘም" : "Page not found"}</h1>
      <p className={styles.lead}>
        {am
          ? "የሚፈልጉት አድራሻ የለም። ወደ መነሻ ይመለሱ።"
          : "We could not find that address. Head back to the home screen."}
      </p>
      <Link className={styles.btn} to="/">
        {am ? "መነሻ" : "Home"}
      </Link>
    </div>
  );
}
