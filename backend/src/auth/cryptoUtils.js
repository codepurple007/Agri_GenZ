import crypto from "crypto";

const ROLES = new Set(["farmer", "extension_agent", "district_admin"]);

export function isValidRole(role) {
  return typeof role === "string" && ROLES.has(role);
}

/** Normalize Ethiopian mobile numbers to E.164 (+251…). */
export function normalizeEthiopiaPhone(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[\s-]/g, "");
  if (s.startsWith("+251")) {
    const rest = s.slice(4);
    return rest.length === 9 && /^[1-9]\d{8}$/.test(rest) ? `+251${rest}` : null;
  }
  if (s.startsWith("251")) return normalizeEthiopiaPhone(`+${s}`);
  if (s.startsWith("0")) return normalizeEthiopiaPhone(`+251${s.slice(1)}`);
  return null;
}

export function generateOtpDigits() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

export function hashOtp(code, phoneE164, purpose) {
  const secret = process.env.JWT_SECRET || "dev-insecure-change-me";
  return crypto.createHmac("sha256", secret).update(`${phoneE164}:${purpose}:${code}`).digest("hex");
}

export function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function otpExpiresAt(msFromNow = 5 * 60 * 1000) {
  return new Date(Date.now() + msFromNow);
}
