import { pool } from "../db.js";
import {
  generateOtpDigits,
  hashOtp,
  otpExpiresAt,
  timingSafeEqualHex,
} from "./cryptoUtils.js";

async function invalidatePendingOtps(client, phoneE164, purpose) {
  await client.query(
    `UPDATE otp_challenges SET consumed = true
     WHERE phone_e164 = $1 AND purpose = $2 AND NOT consumed`,
    [phoneE164, purpose],
  );
}

export const pgStore = {
  async findUserByPhone(phoneE164) {
    const r = await pool.query(
      `SELECT id, phone_e164, full_name, role, created_at FROM users WHERE phone_e164 = $1`,
      [phoneE164],
    );
    return r.rows[0] ?? null;
  },

  async createUser({ phoneE164, fullName, role }) {
    try {
      const r = await pool.query(
        `INSERT INTO users (phone_e164, full_name, role)
         VALUES ($1, $2, $3)
         RETURNING id, phone_e164, full_name, role, created_at`,
        [phoneE164, fullName, role],
      );
      return r.rows[0];
    } catch (e) {
      if (e.code === "23505") {
        const err = new Error("exists");
        err.code = "USER_EXISTS";
        throw err;
      }
      throw e;
    }
  },

  async setOtpChallenge(phoneE164, purpose, meta) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await invalidatePendingOtps(client, phoneE164, purpose);
      const code = generateOtpDigits();
      const codeHash = hashOtp(code, phoneE164, purpose);
      const expiresAt = otpExpiresAt();
      await client.query(
        `INSERT INTO otp_challenges (phone_e164, purpose, code_hash, expires_at, meta)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [phoneE164, purpose, codeHash, expiresAt, JSON.stringify(meta ?? {})],
      );
      await client.query("COMMIT");
      return { plainCode: code, expiresAt };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async verifyOtpConsume(phoneE164, purpose, code) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        `SELECT id, code_hash, expires_at, meta FROM otp_challenges
         WHERE phone_e164 = $1 AND purpose = $2 AND NOT consumed
         ORDER BY created_at DESC LIMIT 1`,
        [phoneE164, purpose],
      );
      const row = r.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "no_challenge" };
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await client.query(
          `UPDATE otp_challenges SET consumed = true WHERE id = $1`,
          [row.id],
        );
        await client.query("COMMIT");
        return { ok: false, reason: "expired" };
      }
      const h = hashOtp(code, phoneE164, purpose);
      if (!timingSafeEqualHex(h, row.code_hash)) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "bad_code" };
      }
      await client.query(`UPDATE otp_challenges SET consumed = true WHERE id = $1`, [row.id]);
      await client.query("COMMIT");
      const meta = row.meta && typeof row.meta === "object" ? row.meta : {};
      return { ok: true, meta };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};
