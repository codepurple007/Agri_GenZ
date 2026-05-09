import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@/auth/types";
import { roleHome } from "@/auth/types";
import { useAuth } from "@/hooks/useAuth";
import styles from "./ProtectedRoute.module.css";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden />
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Outlet />;
}
