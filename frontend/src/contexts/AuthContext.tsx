import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiFetch,
  clearStoredSession,
  getStoredToken,
  getStoredUserProfile,
  setStoredToken,
  setStoredUserProfile,
} from "@/api/client";
import { MOCK_TOKEN, USE_MOCK_API } from "@/api/mockApi";
import type { AuthUser } from "@/auth/types";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((accessToken: string, u: AuthUser) => {
    setStoredToken(accessToken);
    setStoredUserProfile(u);
    setToken(accessToken);
    setUser(u);
  }, []);

  const refreshMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }

    if (USE_MOCK_API && t === MOCK_TOKEN) {
      const profile = getStoredUserProfile();
      if (profile) {
        setUser(profile);
        setToken(t);
        return;
      }
      clearStoredSession();
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/v1/auth/me");
      setUser(data.user);
      setStoredUserProfile(data.user);
      setToken(t);
    } catch {
      clearStoredSession();
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshMe();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const value = useMemo(
    () => ({ user, token, ready, setSession, logout, refreshMe }),
    [user, token, ready, setSession, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
