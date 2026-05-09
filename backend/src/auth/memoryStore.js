import { randomUUID } from "crypto";
import {
  generateOtpDigits,
  hashOtp,
  otpExpiresAt,
  timingSafeEqualHex,
} from "./cryptoUtils.js";

/** In-memory auth store when DATABASE_URL is unset — dev/demo only. */

const usersByPhone = new Map();
const usersById = new Map();
/** phone:purpose -> { codeHash, expiresAt, meta } */
const challenges = new Map();

function challengeKey(phone, purpose) {
  return `${phone}:${purpose}`;
}

export const memoryStore = {
  async findById(id) {
    return usersById.get(id) ?? null;
  },

  async findUserByPhone(phoneE164) {
    return usersByPhone.get(phoneE164) ?? null;
  },

  async createUser({ phoneE164, fullName, role }) {
    if (usersByPhone.has(phoneE164)) {
      const err = new Error("exists");
      err.code = "USER_EXISTS";
      throw err;
    }
    const user = {
      id: randomUUID(),
      phone_e164: phoneE164,
      full_name: fullName,
      role,
      created_at: new Date().toISOString(),
    };
    usersByPhone.set(phoneE164, user);
    usersById.set(user.id, user);
    return user;
  },

  async setOtpChallenge(phoneE164, purpose, meta) {
    const code = generateOtpDigits();
    const codeHash = hashOtp(code, phoneE164, purpose);
    const expiresAt = otpExpiresAt();
    challenges.set(challengeKey(phoneE164, purpose), {
      codeHash,
      expiresAt,
      meta: meta ?? null,
    });
    return { plainCode: code, expiresAt };
  },

  async verifyOtpConsume(phoneE164, purpose, code) {
    const key = challengeKey(phoneE164, purpose);
    const row = challenges.get(key);
    if (!row) return { ok: false, reason: "no_challenge" };
    if (row.expiresAt.getTime() < Date.now()) {
      challenges.delete(key);
      return { ok: false, reason: "expired" };
    }
    const h = hashOtp(code, phoneE164, purpose);
    if (!timingSafeEqualHex(h, row.codeHash)) {
      return { ok: false, reason: "bad_code" };
    }
    challenges.delete(key);
    return { ok: true, meta: row.meta };
  },
};
