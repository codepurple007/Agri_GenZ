import crypto from "crypto";

/** Password storage (PBKDF2) — replace with bcrypt in production if preferred. */
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(plain, salt, 100_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(plain, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const h = crypto.pbkdf2Sync(plain, salt, 100_000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(h, "hex"));
}

export function randomInvitationToken() {
  return crypto.randomBytes(32).toString("hex");
}
