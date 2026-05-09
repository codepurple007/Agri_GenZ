import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { findInvestorUserForLogin } from "../data/bankTellerMemory.js";
import { memoryStore } from "./memoryStore.js";
import { pgStore } from "./pgStore.js";
import { isValidRole, normalizeEthiopiaPhone } from "./cryptoUtils.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";
const IS_DEV = process.env.NODE_ENV !== "production";

function store() {
  return pool ? pgStore : memoryStore;
}

function logSmsPlaceholder(phone, code) {
  if (IS_DEV) {
    console.log(
      `[auth] SMS OTP → ${phone}: ${code} (dev — replace with real SMS gateway in production)`,
    );
  }
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      phone: user.phone_e164,
      role: user.role,
      name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getUserFromPayload(payload) {
  if (!payload?.sub) return null;

  if (pool) {
    const r = await pool.query(
      `SELECT id, phone_e164, full_name, role, created_at FROM users WHERE id = $1`,
      [payload.sub],
    );
    if (r.rows[0]) return r.rows[0];
  } else {
    const m = await memoryStore.findById(payload.sub);
    if (m) return m;
  }

  if (
    typeof payload.name === "string" &&
    (payload.role === "clerk" ||
      payload.role === "district_admin" ||
      payload.role === "extension_agent" ||
      payload.role === "investor" ||
      payload.role === "enrollment_clerk" ||
      payload.role === "kebele_worker")
  ) {
    return {
      id: payload.sub,
      phone_e164: typeof payload.phone === "string" ? payload.phone : "",
      full_name: payload.name,
      role: payload.role,
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

export async function registerStart({ phone, fullName, role }) {
  const phoneE164 = normalizeEthiopiaPhone(phone ?? "");
  if (!phoneE164) {
    const err = new Error("invalid_phone");
    err.code = "INVALID_PHONE";
    throw err;
  }
  if (!fullName || String(fullName).trim().length < 2) {
    const err = new Error("invalid_name");
    err.code = "INVALID_NAME";
    throw err;
  }
  if (!isValidRole(role)) {
    const err = new Error("invalid_role");
    err.code = "INVALID_ROLE";
    throw err;
  }
  const existing = await store().findUserByPhone(phoneE164);
  if (existing) {
    const err = new Error("exists");
    err.code = "USER_EXISTS";
    throw err;
  }
  const { plainCode, expiresAt } = await store().setOtpChallenge(phoneE164, "register", {
    fullName: String(fullName).trim(),
    role,
  });
  logSmsPlaceholder(phoneE164, plainCode);
  return {
    phoneE164,
    expiresAt: expiresAt.toISOString(),
    ...(IS_DEV ? { devOtp: plainCode } : {}),
  };
}

export async function registerVerify({ phone, code }) {
  const phoneE164 = normalizeEthiopiaPhone(phone ?? "");
  if (!phoneE164 || !code) {
    const err = new Error("bad_request");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const v = await store().verifyOtpConsume(phoneE164, "register", String(code).trim());
  if (!v.ok) {
    const err = new Error(v.reason);
    err.code = v.reason?.toUpperCase() ?? "VERIFY_FAILED";
    throw err;
  }
  const meta = v.meta ?? {};
  const fullName = meta.fullName;
  const role = meta.role;
  if (!fullName || !isValidRole(role)) {
    const err = new Error("meta");
    err.code = "INVALID_SESSION";
    throw err;
  }
  const user = await store().createUser({ phoneE164, fullName, role });
  const token = signToken(user);
  return { user, token };
}

export async function loginStart({ phone }) {
  const phoneE164 = normalizeEthiopiaPhone(phone ?? "");
  if (!phoneE164) {
    const err = new Error("invalid_phone");
    err.code = "INVALID_PHONE";
    throw err;
  }
  const existing = await store().findUserByPhone(phoneE164);
  if (!existing) {
    const err = new Error("not_found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }
  const { plainCode, expiresAt } = await store().setOtpChallenge(phoneE164, "login", {});
  logSmsPlaceholder(phoneE164, plainCode);
  return {
    phoneE164,
    expiresAt: expiresAt.toISOString(),
    ...(IS_DEV ? { devOtp: plainCode } : {}),
  };
}

export async function loginVerify({ phone, code }) {
  const phoneE164 = normalizeEthiopiaPhone(phone ?? "");
  if (!phoneE164 || !code) {
    const err = new Error("bad_request");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const v = await store().verifyOtpConsume(phoneE164, "login", String(code).trim());
  if (!v.ok) {
    const err = new Error(v.reason);
    err.code = v.reason?.toUpperCase() ?? "VERIFY_FAILED";
    throw err;
  }
  const user = await store().findUserByPhone(phoneE164);
  if (!user) {
    const err = new Error("not_found");
    err.code = "USER_NOT_FOUND";
    throw err;
  }
  const token = signToken(user);
  return { user, token };
}

/** Shared login for AgriService Hub clerks & admins (credentials determine role). Demo passwords via env. */
export async function staffLogin({ username, password }) {
  const u = String(username ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!u || !p) {
    const err = new Error("bad_request");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const clerkPass = process.env.DEMO_CLERK_PASSWORD ?? "demo";
  const adminPass = process.env.DEMO_ADMIN_PASSWORD ?? "demo";

  let row;
  if (u === "clerk" && p === clerkPass) {
    row = {
      id: "11111111-1111-1111-1111-111111111111",
      phone_e164: "+251900000001",
      full_name: "Demo Clerk",
      role: "clerk",
    };
  } else if ((u === "admin" || u === "administrator") && p === adminPass) {
    row = {
      id: "22222222-2222-2222-2222-222222222222",
      phone_e164: "+251900000002",
      full_name: "District Administrator",
      role: "district_admin",
    };
  } else if (u === "enrollment" && p === (process.env.DEMO_ENROLLMENT_CLERK_PASSWORD ?? "demo")) {
    row = {
      id: "44444444-4444-4444-4444-444444444444",
      phone_e164: "+251900000004",
      full_name: "Enrollment Clerk",
      role: "enrollment_clerk",
    };
  } else if (u === "kebele" && p === (process.env.DEMO_KEBELE_PASSWORD ?? "demo")) {
    row = {
      id: "66666666-6666-6666-6666-666666666666",
      phone_e164: "+251900000006",
      full_name: "Almaz D. (Kebele worker)",
      role: "kebele_worker",
    };
  } else {
    const err = new Error("invalid_credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const token = signToken(row);
  return {
    user: {
      id: row.id,
      phone: row.phone_e164,
      fullName: row.full_name,
      role: row.role,
    },
    token,
  };
}

/** Investor login — email + password after invitation setup only (Bank Teller model). */
export async function investorLogin({ username, password }) {
  const u = String(username ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!u || !p) {
    const err = new Error("bad_request");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const row = findInvestorUserForLogin(u, p);
  if (!row) {
    const err = new Error("invalid_credentials");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }
  const userRow = {
    id: row.userId,
    phone_e164: row.phone_e164,
    full_name: row.full_name,
    role: "investor",
  };
  const token = signToken(userRow);
  return {
    user: {
      id: row.userId,
      phone: row.phone_e164,
      fullName: row.full_name,
      role: "investor",
    },
    token,
  };
}
