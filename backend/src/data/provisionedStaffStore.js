/**
 * Accounts created via Super Admin (staff username/password JWT — in-memory demo).
 */

import { randomUUID } from "crypto";
import { isValidRegionId, normalizeDistrictNumber } from "../agriSms/ethiopiaRegions.js";

/** @typedef {{ id: string, username_lc: string, password: string, phone_e164: string, full_name: string, role: string, sms_region?: string, sms_district?: number }} StaffRow */

/** @type {StaffRow[]} */
let rows = [];

export function provisionStaffLoginFind(usernameLc, password) {
  return rows.find((r) => r.username_lc === usernameLc && r.password === password) ?? null;
}

/** @returns {StaffRow} */
export function provisionStaffInsert({
  username,
  password,
  role,
  fullName,
  sms_region,
  sms_district,
}) {
  const username_lc = String(username ?? "").trim().toLowerCase();
  const p = String(password ?? "");
  if (!username_lc || !p || !String(fullName ?? "").trim()) {
    const err = new Error("bad_staff");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const exists = rows.some((r) => r.username_lc === username_lc);
  if (exists) {
    const err = new Error("username_taken");
    err.code = "USERNAME_TAKEN";
    throw err;
  }
  /** @type {StaffRow} */
  const row = {
    id: randomUUID(),
    username_lc,
    password: p,
    phone_e164: "+251900000099",
    full_name: String(fullName ?? "").trim(),
    role,
  };
  if (sms_region != null && String(sms_region).trim()) row.sms_region = String(sms_region).trim();
  if (sms_district != null && sms_district !== "") {
    const d = Number(sms_district);
    if (Number.isInteger(d) && d >= 1 && d <= 5) row.sms_district = d;
  }
  rows.push(row);
  return row;
}

/** List without passwords (Super Admin dashboard). */
export function provisionStaffListPublic() {
  return rows.map((r) => ({
    id: r.id,
    username: r.username_lc,
    full_name: r.full_name,
    role: r.role,
    sms_region: r.sms_region ?? null,
    sms_district: r.sms_district ?? null,
    source: "superadmin_provisioned",
  }));
}

export function provisionStaffFind(usernameLc) {
  const u = String(usernameLc ?? "").trim().toLowerCase();
  return rows.find((r) => r.username_lc === u) ?? null;
}

/** @returns {boolean} */
export function provisionStaffRemove(usernameLc) {
  const u = String(usernameLc ?? "").trim().toLowerCase();
  const i = rows.findIndex((r) => r.username_lc === u);
  if (i < 0) {
    const e = new Error("not_found");
    e.code = "NOT_FOUND";
    throw e;
  }
  rows.splice(i, 1);
  return true;
}

/** @param {{ fullName?, password?, role?, sms_region?, sms_district?, phone? }} body */
export function provisionStaffPatch(usernameLc, body) {
  const u = String(usernameLc ?? "").trim().toLowerCase();
  const r = provisionStaffFind(u);
  if (!r) {
    const err = new Error("not_found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (typeof body.fullName === "string" && body.fullName.trim().length >= 2) {
    r.full_name = body.fullName.trim();
  }

  const roleIn = typeof body.role === "string" ? body.role.trim() : "";
  if (roleIn === "kebele_worker" || roleIn === "voice_recorder_officer") r.role = roleIn;

  if (typeof body.phone === "string" && body.phone.trim()) {
    let p = body.phone.trim().replace(/\s+/g, "");
    if (/^09\d{8}$/.test(p)) p = `+251${p.slice(1)}`;
    else if (p.startsWith("251") && !p.startsWith("+")) p = `+${p}`;
    if (p.startsWith("+251")) r.phone_e164 = p;
  }

  const pw = typeof body.password === "string" ? body.password.trim() : null;
  if (pw !== null) {
    if (pw !== "" && pw.length < 8 && pw !== "demo") {
      const e = new Error("bad_password");
      e.code = "BAD_PASSWORD_LEN";
      throw e;
    }
    if (pw !== "") r.password = pw;
  }

  if (r.role === "voice_recorder_officer") {
    delete r.sms_region;
    delete r.sms_district;
  } else if (typeof body.sms_region === "string" && body.sms_region.trim()) {
    const reg = body.sms_region.trim();
    if (!isValidRegionId(reg)) {
      const e = new Error("bad_region");
      e.code = "INVALID_REGION_STATE";
      throw e;
    }
    r.sms_region = reg;
  }
  if ("sms_district" in body && r.role === "kebele_worker") {
    const dn = normalizeDistrictNumber(body.sms_district);
    if (dn == null && body.sms_district !== undefined && body.sms_district !== "") {
      const e = new Error("bad_district");
      e.code = "INVALID_DISTRICT";
      throw e;
    }
    if (dn != null) r.sms_district = dn;
  }

  return r;
}

/**
 * Idempotent hackathon/demo seed — Voice Recorder Officer so teams can log in without Super Admin UI.
 * Override via STAFF_DEMO_VOICE_USERNAME / STAFF_DEMO_VOICE_PASSWORD / STAFF_DEMO_VOICE_FULL_NAME.
 */
export function provisionStaffSeedFromEnv() {
  const username = String(process.env.STAFF_DEMO_VOICE_USERNAME ?? "nati").trim().toLowerCase();
  const password = String(process.env.STAFF_DEMO_VOICE_PASSWORD ?? "nati");
  const fullName = String(process.env.STAFF_DEMO_VOICE_FULL_NAME ?? "Nati").trim() || "Nati";
  if (!username || !password) return;
  if (provisionStaffFind(username)) return;
  try {
    provisionStaffInsert({
      username,
      password,
      role: "voice_recorder_officer",
      fullName,
    });
    console.log(`[staff] seeded demo Voice Recorder officer: ${username}`);
  } catch (e) {
    if (e?.code === "USERNAME_TAKEN") return;
    console.error("[staff] demo seed failed:", e);
  }
}
