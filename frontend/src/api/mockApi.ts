/**
 * In-browser demo API — no backend required. Disable with `VITE_USE_REAL_API=true`.
 */
import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";
import { tryHandleAgriSms } from "@/api/agriSmsMockApi";
import { tryHandleGeo } from "@/api/geoMockApi";

export const USE_MOCK_API = import.meta.env.VITE_USE_REAL_API !== "true";

export const MOCK_TOKEN = "mock-session-token";

type PendingInvestorRow = {
  id: string;
  org_name: string;
  verification_status: string;
  invitation_sent: boolean;
  setup_completed: boolean;
  created_at: string;
  enrolled_by: string | null;
};

let mockEnrollmentRows: PendingInvestorRow[] = [
  {
    id: "inv-demo-1",
    org_name: "North Shewa Growers Cooperative",
    verification_status: "PENDING_VERIFICATION",
    invitation_sent: true,
    setup_completed: true,
    created_at: new Date().toISOString(),
    enrolled_by: "44444444-4444-4444-4444-444444444444",
  },
];

export const MOCK_FARMER_QUEUE = {
  investment_id: "demo-inv-1",
  farmer_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  anonymous_code: "ETH-0042",
  crop: "Teff",
  stage_current: 2,
  stages_total: 3,
  next_disbursement_etb: 12000,
};

const STAFF_DEMOS: Record<
  string,
  { password: string; user: AuthUser }
> = {
  clerk: {
    password: "demo",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      phone: "+251900000001",
      fullName: "Demo Clerk",
      role: "clerk",
    },
  },
  admin: {
    password: "demo",
    user: {
      id: "22222222-2222-2222-2222-222222222222",
      phone: "+251900000002",
      fullName: "District Administrator",
      role: "district_admin",
    },
  },
  administrator: {
    password: "demo",
    user: {
      id: "22222222-2222-2222-2222-222222222222",
      phone: "+251900000002",
      fullName: "District Administrator",
      role: "district_admin",
    },
  },
  enrollment: {
    password: "demo",
    user: {
      id: "44444444-4444-4444-4444-444444444444",
      phone: "+251900000004",
      fullName: "Enrollment Clerk",
      role: "enrollment_clerk",
    },
  },
  kebele: {
    password: "demo",
    user: {
      id: "66666666-6666-6666-6666-666666666666",
      phone: "+251900000006",
      fullName: "Almaz D. (Kebele worker)",
      role: "kebele_worker",
      smsRegion: "amhara",
      smsDistrict: 3,
    },
  },
};

function readMockSessionUser(): AuthUser | null {
  try {
    const s = localStorage.getItem("agri_genz_user_profile");
    if (!s) return null;
    return JSON.parse(s) as AuthUser;
  } catch {
    return null;
  }
}

function parseJson(body: string | undefined): Record<string, unknown> {
  if (!body) return {};
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normPhone(p: string): string {
  let s = String(p).replace(/[\s-]/g, "");
  if (!s.startsWith("+")) {
    s = s.startsWith("0") ? `+251${s.slice(1)}` : `+251${s}`;
  }
  return s;
}

export async function runMockApi<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  if (!USE_MOCK_API) return undefined;

  const [pathname, search = ""] = path.includes("?") ? path.split("?") : [path, ""];
  const method = (init?.method ?? "GET").toUpperCase();
  const body = typeof init?.body === "string" ? init.body : undefined;
  const json = parseJson(body);

  if (method === "GET" && pathname === "/api/v1/landing") {
    return {
      ussdCodePlaceholder: "*850#",
      partnerMessage: "Demo mode — no server.",
      updatedAt: new Date().toISOString(),
    } as T;
  }

  const geoHandled = tryHandleGeo<T>(pathname, search, method);
  if (geoHandled !== undefined) return geoHandled;

  const agriHandled = tryHandleAgriSms<T>(pathname, search, method, body, parseJson, readMockSessionUser());
  if (agriHandled !== undefined) return agriHandled;

  if (method === "POST" && pathname === "/api/v1/auth/staff/login") {
    const u = String(json.username ?? "").trim().toLowerCase();
    const p = String(json.password ?? "");
    const row = STAFF_DEMOS[u];
    if (!row || row.password !== p) {
      throw new ApiError(401, "Incorrect username or password.", { error: "invalid_credentials" });
    }
    return { ok: true, token: MOCK_TOKEN, user: row.user } as T;
  }

  if (method === "POST" && pathname === "/api/v1/auth/investor/login") {
    const u = String(json.username ?? "").trim().toLowerCase();
    const p = String(json.password ?? "");
    if (!u || !p) {
      throw new ApiError(401, "Incorrect username or password.", { error: "invalid_credentials" });
    }
    const user: AuthUser = {
      id: "33333333-3333-3333-3333-333333333333",
      phone: "+251900000003",
      fullName: "Demo Investor Cooperative",
      role: "investor",
    };
    return { ok: true, token: MOCK_TOKEN, user } as T;
  }

  if (method === "POST" && pathname === "/api/v1/auth/register/start") {
    return {
      ok: true,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      devOtp: "123456",
    } as T;
  }

  if (method === "POST" && pathname === "/api/v1/auth/register/verify") {
    const phone = normPhone(String(json.phone ?? ""));
    const code = String(json.code ?? "").trim();
    if (code !== "123456") {
      throw new ApiError(401, "Incorrect or expired code.", { error: "invalid_code" });
    }
    const fullName = "Registered Farmer";
    const user: AuthUser = {
      id: "55555555-5555-5555-5555-555555555555",
      phone,
      fullName,
      role: "farmer",
    };
    return { ok: true, token: MOCK_TOKEN, user } as T;
  }

  if (method === "GET" && pathname.startsWith("/api/v1/clerk/disbursement-queue")) {
    return { ok: true, items: [MOCK_FARMER_QUEUE] } as T;
  }

  if (method === "POST" && pathname.includes("/verify-for-disbursement")) {
    const parts = pathname.split("/");
    const farmerIdx = parts.indexOf("farmer");
    const farmerId = farmerIdx >= 0 ? parts[farmerIdx + 1] : "";
    const code = String(json.anonymous_code ?? json.qr_payload ?? "").trim().toUpperCase();
    if (!farmerId || code !== "ETH-0042" || farmerId !== MOCK_FARMER_QUEUE.farmer_id) {
      throw new ApiError(403, "Code does not match this farmer record.", {
        error: "verification_failed",
      });
    }
    const expires = new Date(Date.now() + 15 * 60_000).toISOString();
    return {
      ok: true,
      access_token: "mock-farmer-access",
      expires_at: expires,
      farmer: {
        id: farmerId,
        full_name: "Abebe Beyene",
        phone_e164: "+251912345678",
        anonymous_code: "ETH-0042",
        photo_url: null,
      },
    } as T;
  }

  if (method === "POST" && pathname === "/api/v1/enrollment/investors") {
    const row: PendingInvestorRow = {
      id: `inv-${Date.now()}`,
      org_name: String(json.org_name ?? "New org"),
      verification_status: "PENDING_VERIFICATION",
      invitation_sent: true,
      setup_completed: false,
      created_at: new Date().toISOString(),
      enrolled_by: "44444444-4444-4444-4444-444444444444",
    };
    mockEnrollmentRows = [row, ...mockEnrollmentRows];
    return {
      ok: true,
      investor_org_id: row.id,
      invitation_token: "demo-invite-token",
      invitation_expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      magic_link_preview: `/investor/setup?token=demo-invite-token`,
    } as T;
  }

  if (method === "GET" && pathname.startsWith("/api/v1/enrollment/pending-investors")) {
    return { ok: true, investors: mockEnrollmentRows } as T;
  }

  if (method === "GET" && pathname.startsWith("/api/v1/public/investor/setup")) {
    const params = new URLSearchParams(search);
    const token =
      params.get("token") ??
      (pathname.includes("/setup/") ? pathname.split("/setup/")[1]?.split("/")[0] : null);
    if (!token) {
      throw new ApiError(400, "Missing token.", { error: "bad_request" });
    }
    return {
      ok: true,
      org_name: "Demo Cooperative (mock)",
      org_type: "cooperative",
      contact_email: "investor@demo.local",
      setup_completed: false,
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    } as T;
  }

  if (method === "POST" && /\/api\/v1\/public\/investor\/setup\/[^/]+$/.test(pathname)) {
    return { ok: true, account_setup_completed_at: new Date().toISOString() } as T;
  }

  return undefined;
}
