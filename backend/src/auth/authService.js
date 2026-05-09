import jwt from "jsonwebtoken";
import { pool } from "../db.js";
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
    return r.rows[0] ?? null;
  }
  return memoryStore.findById(payload.sub);
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
