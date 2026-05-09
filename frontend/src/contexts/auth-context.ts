import { createContext } from "react";
import type { AuthUser } from "@/auth/types";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
