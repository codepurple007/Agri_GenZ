/**
 * In-browser demo API — no backend required. Disable with `VITE_USE_REAL_API=true`.
 */
import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";
import { ETHIOPIA_REGION_IDS } from "@/agriSms/constants";
import { tryHandleAgriSms } from "@/api/agriSmsMockApi";
import { tryHandleGeo } from "@/api/geoMockApi";
import { tryHandleSuperadminVoiceJobsApi, tryHandleVoiceRecorderApi } from "@/api/voiceRecorderMock";

export const USE_MOCK_API = import.meta.env.VITE_USE_REAL_API !== "true";

export const MOCK_TOKEN = "mock-session-token";

type MockProvisionRow = { usernameLc: string; password: string; user: AuthUser };

/** SuperAdmin-provisioned kebele / voice staff (demo in-memory only). */
const mockProvisionedStaff: MockProvisionRow[] = [
  {
    usernameLc: "nati",
    password: "nati",
    user: {
      id: "33333333-3333-3333-3333-333333333333",
      phone: "+251900000033",
      fullName: "Nati",
      role: "voice_recorder_officer",
    },
  },
];

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
      smsRegion: "kebele_3",
      smsDistrict: 3,
    },
  },
  gameda: {
    password: "demo",
    user: {
      id: "99999999-9999-9999-9999-999999999999",
      phone: "+251900000009",
      fullName: "Gameda B.",
      role: "kebele_worker",
      smsRegion: "kebele_4",
      smsDistrict: 2,
    },
  },
  voice: {
    password: "demo",
    user: {
      id: "77777777-7777-7777-7777-777777777777",
      phone: "+251900000007",
      fullName: "Voice Recorder Officer (demo)",
      role: "voice_recorder_officer",
    },
  },
  superadmin: {
    password: "demo",
    user: {
      id: "88888888-8888-8888-8888-888888888888",
      phone: "+251900000008",
      fullName: "Super Administrator (demo)",
      role: "superadmin",
    },
  },
  owner: {
    password: "demo",
    user: {
      id: "88888888-8888-8888-8888-888888888888",
      phone: "+251900000008",
      fullName: "Super Administrator (demo)",
      role: "superadmin",
    },
  },
};

function requireMockSuperadmin(session: AuthUser | null): AuthUser {
  if (!session || session.role !== "superadmin") {
    throw new ApiError(403, "Super admin session required.", { error: "forbidden" });
  }
  return session;
}

type SuperAdminAccountRow = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  sms_region: string | null;
  sms_district: number | null;
  source: string;
};

const SMS_PRESET_SUPERADMIN_IDS = ["kebele", "gameda", "voice"] as const;

/** Deactivated builtins do not authenticate; username can be recreated as provisioned. */
const smsBuiltinDisabled = new Set<string>();

type BuiltinSmsPatch = {
  password?: string | null;
  fullName?: string;
  phone?: string;
  role?: string;
  sms_region?: string | null;
  sms_district?: number | null;
};

const smsBuiltinPatchByUser = new Map<string, BuiltinSmsPatch>();

function smsBuiltinOccupiesMock(usernameLc: string): boolean {
  return (
    SMS_PRESET_SUPERADMIN_IDS.includes(usernameLc as (typeof SMS_PRESET_SUPERADMIN_IDS)[number]) &&
    !smsBuiltinDisabled.has(usernameLc)
  );
}

function smsBuiltinEffectivePassword(usernameLc: string): string | undefined {
  const demo = STAFF_DEMOS[usernameLc as keyof typeof STAFF_DEMOS];
  const basePw = demo?.password;
  const patch = smsBuiltinPatchByUser.get(usernameLc);
  if (patch && Object.prototype.hasOwnProperty.call(patch, "password")) {
    const x = patch.password;
    if (x === undefined || x === null || String(x).trim() === "") return basePw;
    return String(x);
  }
  return basePw;
}

function tryAuthenticateSmsPresetMock(usernameLc: string, plainPw: string): AuthUser | null {
  const isPreset = SMS_PRESET_SUPERADMIN_IDS.includes(
    usernameLc as (typeof SMS_PRESET_SUPERADMIN_IDS)[number],
  );
  if (!isPreset) return null;
  if (smsBuiltinDisabled.has(usernameLc)) return null;
  const exp = smsBuiltinEffectivePassword(usernameLc);
  if (exp !== plainPw) return null;
  return mergeSmsBuiltinAuthUser(usernameLc);
}

function mergeSmsBuiltinAuthUser(usernameLc: string): AuthUser {
  const demo = STAFF_DEMOS[usernameLc as keyof typeof STAFF_DEMOS];
  const o = smsBuiltinPatchByUser.get(usernameLc) ?? {};
  const u: AuthUser = { ...demo.user };
  if (typeof o.fullName === "string" && o.fullName.trim().length >= 2) u.fullName = o.fullName.trim();

  let role = u.role;
  if (typeof o.role === "string") {
    const r = o.role.trim();
    if (r === "kebele_worker" || r === "voice_recorder_officer") role = r as AuthUser["role"];
  }
  u.role = role;

  if (typeof o.phone === "string" && o.phone.trim()) u.phone = o.phone.trim();

  if (u.role === "voice_recorder_officer") {
    delete u.smsRegion;
    delete u.smsDistrict;
    return u;
  }
  const regTrim = typeof o.sms_region === "string" ? o.sms_region.trim() : "";
  if (regTrim && (ETHIOPIA_REGION_IDS as readonly string[]).includes(regTrim)) {
    u.smsRegion = regTrim;
  }
  if ("sms_district" in o) {
    const d = typeof o.sms_district === "number" ? o.sms_district : Number(o.sms_district);
    if (Number.isInteger(d) && d >= 1 && d <= 5) u.smsDistrict = d;
  }
  return u;
}

function applyBuiltinSmsPatchesToRow(uc: string, base: SuperAdminAccountRow): SuperAdminAccountRow {
  const ov = smsBuiltinPatchByUser.get(uc) ?? {};
  let role = base.role;
  if (typeof ov.role === "string") {
    const r = ov.role.trim();
    if (r === "kebele_worker" || r === "voice_recorder_officer") role = r;
  }
  const row: SuperAdminAccountRow = {
    ...base,
    full_name:
      typeof ov.fullName === "string" && ov.fullName.trim().length >= 2 ? ov.fullName.trim() : base.full_name,
    role,
  };
  if (role === "voice_recorder_officer") {
    row.sms_region = null;
    row.sms_district = null;
    return row;
  }
  const regTrim = typeof ov.sms_region === "string" ? ov.sms_region.trim() : "";
  if (regTrim && (ETHIOPIA_REGION_IDS as readonly string[]).includes(regTrim)) {
    row.sms_region = regTrim;
  }
  if ("sms_district" in ov) {
    const d =
      typeof ov.sms_district === "number" ? ov.sms_district : Number(ov.sms_district ?? Number.NaN);
    if (Number.isInteger(d) && d >= 1 && d <= 5) row.sms_district = d;
  }
  return row;
}

function mockApplyBuiltinSmsPatchFromBody(uc: string, j: Record<string, unknown>): void {
  const cur = { ...(smsBuiltinPatchByUser.get(uc) ?? {}) };
  const fn = typeof j.fullName === "string" ? j.fullName : undefined;
  if (fn !== undefined && String(fn).trim().length >= 2) cur.fullName = String(fn).trim();

  const rk = typeof j.role === "string" ? j.role.trim() : "";
  if (rk === "kebele_worker" || rk === "voice_recorder_officer") cur.role = rk;

  if (typeof j.phone === "string" && j.phone.trim()) cur.phone = j.phone.trim();

  if ("password" in j) {
    const pw = typeof j.password === "string" ? j.password.trim() : "";
    if (pw === "") cur.password = null;
    else if (pw.length >= 8 || pw === "demo") cur.password = pw;
    else {
      throw new ApiError(400, "Password must be at least 8 characters, or demo.", { error: "bad_password" });
    }
  }

  const effRole =
    cur.role ??
    (STAFF_DEMOS[uc as keyof typeof STAFF_DEMOS]?.user.role === "voice_recorder_officer"
      ? "voice_recorder_officer"
      : "kebele_worker");
  if (effRole === "voice_recorder_officer") {
    cur.sms_region = null;
    cur.sms_district = null;
  } else {
    if (typeof j.sms_region === "string") {
      const reg = j.sms_region.trim();
      if (!(ETHIOPIA_REGION_IDS as readonly string[]).includes(reg)) {
        throw new ApiError(400, "Invalid kebele unit id.", { error: "invalid_region_state" });
      }
      cur.sms_region = reg;
    }
    if ("sms_district" in j) {
      const d = Number(j.sms_district);
      if (!Number.isInteger(d) || d < 1 || d > 5) {
        throw new ApiError(400, "Pick district 1–5.", { error: "invalid_district" });
      }
      cur.sms_district = d;
    }
  }
  smsBuiltinPatchByUser.set(uc, cur);
}

function mockPatchProvisionStaff(usernameLc: string, j: Record<string, unknown>): void {
  const r = mockProvisionedStaff.find((row) => row.usernameLc === usernameLc);
  if (!r) {
    throw new ApiError(404, "Account not found.", { error: "not_found" });
  }

  const fn = typeof j.fullName === "string" ? String(j.fullName).trim() : "";
  if (fn.length >= 2) r.user.fullName = fn;

  const rk = typeof j.role === "string" ? j.role.trim() : "";
  if (rk === "kebele_worker" || rk === "voice_recorder_officer") r.user.role = rk as AuthUser["role"];

  if (typeof j.phone === "string" && j.phone.trim()) {
    const p =
      typeof j.phone === "string"
        ? j.phone.trim().replace(/\s+/g, "")
        : "";
    if (p) r.user.phone = p.startsWith("+") ? p : p.startsWith("0") ? `+251${p.slice(1)}` : p;
  }

  if ("password" in j) {
    const pw = typeof j.password === "string" ? j.password.trim() : "";
    if (pw !== "" && pw.length < 8 && pw !== "demo") {
      throw new ApiError(400, "Password must be at least 8 characters, or demo.", { error: "bad_password" });
    }
    if (pw !== "") r.password = pw;
  }

  if (r.user.role === "voice_recorder_officer") {
    delete r.user.smsRegion;
    delete r.user.smsDistrict;
    return;
  }
  const regTrim = typeof j.sms_region === "string" ? j.sms_region.trim() : "";
  if (regTrim) {
    if (!(ETHIOPIA_REGION_IDS as readonly string[]).includes(regTrim)) {
      throw new ApiError(400, "Invalid kebele unit id.", { error: "invalid_region_state" });
    }
    r.user.smsRegion = regTrim;
  }
  if ("sms_district" in j) {
    const d = Number(j.sms_district);
    if (!Number.isInteger(d) || d < 1 || d > 5) {
      throw new ApiError(400, "Pick district 1–5.", { error: "invalid_district" });
    }
    r.user.smsDistrict = d;
  }
}

function builtinSmsStaffRowsMergedForSuperadmin(): SuperAdminAccountRow[] {
  return SMS_PRESET_SUPERADMIN_IDS.filter((uc) => !smsBuiltinDisabled.has(uc))
    .map((uc) => {
      const demo = STAFF_DEMOS[uc];
      const base: SuperAdminAccountRow = {
        id: demo.user.id,
        username: uc,
        full_name: demo.user.fullName,
        role: demo.user.role,
        sms_region: demo.user.smsRegion ?? null,
        sms_district: demo.user.smsDistrict ?? null,
        source: "demo_builtin",
      };
      return applyBuiltinSmsPatchesToRow(uc, base);
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

function mergeSuperadminStaffAccounts(rows: SuperAdminAccountRow[]): SuperAdminAccountRow[] {
  const keyed = new Map<string, SuperAdminAccountRow>();
  for (const a of builtinSmsStaffRowsMergedForSuperadmin()) keyed.set(a.username, { ...a });
  for (const a of rows) keyed.set(a.username, { ...a });
  return [...keyed.values()].sort((x, y) => x.username.localeCompare(y.username));
}

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

  const voiceHandled = tryHandleVoiceRecorderApi<T>(pathname, method, body, parseJson, readMockSessionUser());
  if (voiceHandled !== undefined) return voiceHandled;

  const saVoiceHandled = tryHandleSuperadminVoiceJobsApi<T>(pathname, method, body, parseJson, readMockSessionUser());
  if (saVoiceHandled !== undefined) return saVoiceHandled;

  if (method === "GET" && pathname === "/api/v1/superadmin/staff-accounts") {
    requireMockSuperadmin(readMockSessionUser());
    const provisioned: SuperAdminAccountRow[] = mockProvisionedStaff.map((row) => ({
      id: row.user.id,
      username: row.usernameLc,
      full_name: row.user.fullName,
      role: row.user.role,
      sms_region: row.user.smsRegion ?? null,
      sms_district: row.user.smsDistrict ?? null,
      source: "superadmin_provisioned",
    }));
    return { ok: true, accounts: mergeSuperadminStaffAccounts(provisioned) } as T;
  }

  if (method === "POST" && pathname === "/api/v1/superadmin/staff-accounts") {
    requireMockSuperadmin(readMockSessionUser());
    const username = String(json.username ?? "").trim().toLowerCase();
    const pw = String(json.password ?? "").trim() || `demo-${Math.random().toString(36).slice(2, 10)}`;
    const r = String(json.role ?? "").trim();
    const fn = String(json.fullName ?? "").trim();
    if (!username || fn.length < 2) {
      throw new ApiError(400, "Username and full name required.", { error: "bad_request" });
    }
    if (r !== "kebele_worker" && r !== "voice_recorder_officer") {
      throw new ApiError(
        400,
        "Only kebele_worker or voice_recorder_officer can be provisioned here.",
        { error: "invalid_role" },
      );
    }
    if (mockProvisionedStaff.some((row) => row.usernameLc === username) || smsBuiltinOccupiesMock(username)) {
      throw new ApiError(409, "Username already taken.", { error: "username_taken" });
    }
    const uid = crypto.randomUUID();
    const idx = mockProvisionedStaff.length;
    const phone = `+25190001${String(idx).padStart(3, "0")}`;
    const user: AuthUser = {
      id: uid,
      phone,
      fullName: fn,
      role: r as AuthUser["role"],
    };
    if (r === "kebele_worker") {
      const reg =
        typeof json.sms_region === "string" && json.sms_region.trim() ? json.sms_region.trim() : "kebele_3";
      const dis = Number(json.sms_district);
      user.smsRegion = reg;
      user.smsDistrict =
        Number.isFinite(dis) && Number.isInteger(dis) && dis >= 1 && dis <= 5 ? dis : 3;
    }
    mockProvisionedStaff.push({ usernameLc: username, password: pw, user });
    return {
      ok: true,
      account: {
        id: user.id,
        username,
        full_name: user.fullName,
        role: user.role,
        sms_region: user.smsRegion ?? null,
        sms_district: user.smsDistrict ?? null,
      },
      initial_password_shown_once: pw,
      credential_note: "Save this password now; it will not be returned again.",
    } as T;
  }

  const superStaffMx = pathname.match(/^\/api\/v1\/superadmin\/staff-accounts\/([^/]+)$/);
  if (method === "PUT" && superStaffMx) {
    requireMockSuperadmin(readMockSessionUser());
    const uc = decodeURIComponent(superStaffMx[1] ?? "").trim().toLowerCase();
    try {
      if (
        SMS_PRESET_SUPERADMIN_IDS.includes(uc as (typeof SMS_PRESET_SUPERADMIN_IDS)[number])
      ) {
        mockApplyBuiltinSmsPatchFromBody(uc, json);
      } else {
        mockPatchProvisionStaff(uc, json);
      }
      const merged = mergeSuperadminStaffAccounts(
        mockProvisionedStaff.map((row) => ({
          id: row.user.id,
          username: row.usernameLc,
          full_name: row.user.fullName,
          role: row.user.role,
          sms_region: row.user.smsRegion ?? null,
          sms_district: row.user.smsDistrict ?? null,
          source: "superadmin_provisioned",
        })),
      );
      const row = merged.find((a) => a.username === uc) ?? null;
      return { ok: true, account: row } as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(400, "Update failed.", { error: "bad_request" });
    }
  }

  if (method === "DELETE" && superStaffMx) {
    requireMockSuperadmin(readMockSessionUser());
    const uc = decodeURIComponent(superStaffMx[1] ?? "").trim().toLowerCase();
    if (SMS_PRESET_SUPERADMIN_IDS.includes(uc as (typeof SMS_PRESET_SUPERADMIN_IDS)[number])) {
      smsBuiltinDisabled.add(uc);
      smsBuiltinPatchByUser.delete(uc);
    } else {
      const i = mockProvisionedStaff.findIndex((row) => row.usernameLc === uc);
      if (i < 0) {
        throw new ApiError(404, "Account not found.", { error: "not_found" });
      }
      mockProvisionedStaff.splice(i, 1);
    }
    return { ok: true } as T;
  }

  if (method === "POST" && pathname === "/api/v1/auth/staff/login") {
    const u = String(json.username ?? "").trim().toLowerCase();
    const p = String(json.password ?? "");

    const isSmsPreset = SMS_PRESET_SUPERADMIN_IDS.includes(
      u as (typeof SMS_PRESET_SUPERADMIN_IDS)[number],
    );
    if (isSmsPreset && !smsBuiltinDisabled.has(u)) {
      const smsUser = tryAuthenticateSmsPresetMock(u, p);
      if (!smsUser) {
        throw new ApiError(401, "Incorrect username or password.", { error: "invalid_credentials" });
      }
      return { ok: true, token: MOCK_TOKEN, user: smsUser } as T;
    }

    const pv = mockProvisionedStaff.find((x) => x.usernameLc === u && x.password === p);
    if (pv) {
      return { ok: true, token: MOCK_TOKEN, user: pv.user } as T;
    }

    const blockStaffSms = isSmsPreset && smsBuiltinDisabled.has(u);
    const row = STAFF_DEMOS[u];
    if (!blockStaffSms && row && row.password === p) {
      return { ok: true, token: MOCK_TOKEN, user: row.user } as T;
    }

    throw new ApiError(401, "Incorrect username or password.", { error: "invalid_credentials" });
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
