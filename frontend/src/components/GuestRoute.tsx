import { Navigate, Outlet } from "react-router-dom";
import { roleHome } from "@/auth/types";
import { useAuth } from "@/hooks/useAuth";
import styles from "@/components/ProtectedRoute.module.css";

/** Sends authenticated users away from login/register. */
export function GuestRoute() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden />
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}
