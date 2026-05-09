const TOKEN_KEY = "agri_genz_token";

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

export type ApiErrorBody = { error?: string; message?: string };

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, message: string, body: ApiErrorBody) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const r = await fetch(path, { ...init, headers });
  const json = (await r.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!r.ok) {
    const msg =
      typeof json === "object" && json && "message" in json && typeof json.message === "string"
        ? json.message
        : r.statusText;
    throw new ApiError(r.status, msg, json as ApiErrorBody);
  }
  return json as T;
}
