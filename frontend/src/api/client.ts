import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";
import { MOCK_TOKEN, runMockApi, USE_MOCK_API } from "@/api/mockApi";

export { ApiError } from "@/api/errors";

const TOKEN_KEY = "agri_genz_token";
const USER_JSON_KEY = "agri_genz_user_profile";

/** Optional direct API URL — only used when `VITE_USE_REAL_API=true`. */
const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? "").replace(/\/$/, "");

export function resolveApiUrl(path: string): string {
  if (!path.startsWith("/")) return path;
  if (apiOrigin && path.startsWith("/api")) {
    return `${apiOrigin}${path}`;
  }
  return path;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredUserProfile(): AuthUser | null {
  try {
    const s = localStorage.getItem(USER_JSON_KEY);
    if (!s) return null;
    return JSON.parse(s) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUserProfile(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_JSON_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_JSON_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredSession(): void {
  setStoredToken(null);
  setStoredUserProfile(null);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const rawPath = path.split("?")[0];
  const method = (init?.method ?? "GET").toUpperCase();

  if (USE_MOCK_API && rawPath === "/api/v1/auth/me" && method === "GET") {
    const t = getStoredToken();
    const u = getStoredUserProfile();
    if (t === MOCK_TOKEN && u) return { user: u } as T;
    throw new ApiError(401, "Session expired.", { error: "unauthorized" });
  }

  try {
    const mocked = await runMockApi<T>(path, init);
    if (mocked !== undefined) return mocked;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw e;
  }

  if (USE_MOCK_API) {
    throw new ApiError(
      404,
      `Demo API: no handler for ${method} ${path}. Add it in src/api/mockApi.ts.`,
      {},
    );
  }

  const url = resolveApiUrl(path);
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(url, { ...init, headers });
  const json = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (!r.ok) {
    const msg =
      typeof json === "object" && json && "message" in json && typeof json.message === "string"
        ? json.message
        : r.statusText;
    throw new ApiError(r.status, msg, json as { error?: string; message?: string });
  }
  return json as T;
}

export async function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const mocked = await runMockApi<T>(path, init);
    if (mocked !== undefined) return mocked;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw e;
  }

  if (USE_MOCK_API) {
    throw new ApiError(404, `Demo API: no handler for ${path}`, {});
  }

  const url = resolveApiUrl(path);
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const r = await fetch(url, { ...init, headers });
  const json = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (!r.ok) {
    const msg =
      typeof json === "object" && json && "message" in json && typeof json.message === "string"
        ? json.message
        : r.statusText;
    throw new ApiError(r.status, msg, json as { error?: string; message?: string });
  }
  return json as T;
}
