/**
 * In-memory overlays for builtin Kebele / Voice demo accounts (Super Admin edits).
 */
import { isValidRegionId } from "../agriSms/ethiopiaRegions.js";

/** Demo usernames wired to preset rows in presetSmsStaffListing.js */
const PATCHABLE_IDENTIFIERS = new Set(["kebele", "gameda", "voice"]);

/** @type {Set<string>} */
const deactivated = new Set();

/**
 * Overlay fields merged onto builtin preset defaults.
 *
 * @typedef {{
 *   full_name?: string,
 *   role?: string,
 *   sms_region?: string|null,
 *   sms_district?: number|null,
 *   phone_e164?: string,
 *   password?: string|null
 * }} OverlayPatch */

/** @type {Map<string, OverlayPatch>} */
const patchesByUsername = new Map();

function builtinDefaultRole(usernameLc) {
  return usernameLc === "voice" ? "voice_recorder_officer" : "kebele_worker";
}

export function isBuiltinPresetStaffPatchable(usernameLc) {
  return PATCHABLE_IDENTIFIERS.has(usernameLc);
}

export function isBuiltinPresetStaffDeactivated(usernameLc) {
  return deactivated.has(usernameLc);
}

export function deactivateBuiltinPresetStaff(usernameLc) {
  if (!PATCHABLE_IDENTIFIERS.has(usernameLc)) {
    const e = new Error("not_builtin_preset");
    e.code = "NOT_BUILTIN_PRESET";
    throw e;
  }
  deactivated.add(usernameLc);
  patchesByUsername.delete(usernameLc);
}

/** Active builtin preset occupies the username until deactivated (then provisioning may reuse). */
export function builtinPresetOccupiesUsername(usernameLc) {
  return PATCHABLE_IDENTIFIERS.has(usernameLc) && !deactivated.has(usernameLc);
}

function normSmsPhoneRough(s) {
  let t = String(s ?? "").trim().replace(/\s+/g, "");
  if (/^09\d{8}$/.test(t)) t = `+251${t.slice(1)}`;
  else if (/^251\d+$/.test(t)) t = `+${t}`;
  else if (t.startsWith("0")) t = `+251${t.slice(1)}`;
  return t.startsWith("+251") ? t : "";
}

export function patchBuiltinPresetStaff(usernameLc, body) {
  if (!PATCHABLE_IDENTIFIERS.has(usernameLc)) {
    const e = new Error("not_builtin_preset");
    e.code = "NOT_BUILTIN_PRESET";
    throw e;
  }
  if (deactivated.has(usernameLc)) {
    const e = new Error("deactivated_preset");
    e.code = "DEACTIVATED_PRESET";
    throw e;
  }

  /** @type {OverlayPatch} */
  const cur = { ...(patchesByUsername.get(usernameLc) ?? {}) };

  const fn = typeof body.fullName === "string" ? body.fullName.trim() : "";
  if (fn.length >= 2) cur.full_name = fn;

  const rIn = typeof body.role === "string" ? body.role.trim() : "";
  if (rIn === "kebele_worker" || rIn === "voice_recorder_officer") cur.role = rIn;

  const phoneTrim = typeof body.phone === "string" ? normSmsPhoneRough(body.phone) : "";
  if (phoneTrim) cur.phone_e164 = phoneTrim;

  if ("password" in body) {
    const pw = typeof body.password === "string" ? body.password.trim() : "";
    if (pw === "") cur.password = null;
    else if (pw.length >= 8 || pw === "demo") cur.password = pw;
    else {
      const e = new Error("bad_password");
      e.code = "BAD_PASSWORD_LEN";
      throw e;
    }
  }

  const roleEffective = cur.role ?? builtinDefaultRole(usernameLc);

  if (roleEffective === "voice_recorder_officer") {
    cur.sms_region = null;
    cur.sms_district = null;
  } else if (roleEffective === "kebele_worker") {
    if (typeof body.sms_region === "string") {
      const reg = body.sms_region.trim();
      if (reg) {
        if (!isValidRegionId(reg)) {
          const err = new Error("bad_region");
          err.code = "INVALID_REGION_STATE";
          throw err;
        }
        cur.sms_region = reg;
      }
    }
    if ("sms_district" in body) {
      const d = Number(body.sms_district);
      if (Number.isInteger(d) && d >= 1 && d <= 5) cur.sms_district = d;
    }
  }

  patchesByUsername.set(usernameLc, cur);
}

/** @returns {string | null | undefined} fallback when no overlay password — caller supplies env/demo default */
export function presetPasswordEffective(usernameLc, fallbackPassword) {
  const pw = patchesByUsername.get(usernameLc)?.password;
  if (pw != null && pw !== "") return pw;
  if (fallbackPassword !== undefined && fallbackPassword !== null) return fallbackPassword;
  return null;
}

/**
 * Overlay fields onto preset template (listing row incl. optional phone_e164).
 *
 * @param {Record<string, unknown>} template
 */
export function mergePresetTemplateForListing(template) {
  const usernameLc = String(template.username ?? "");
  const overlay = patchesByUsername.get(usernameLc) ?? {};
  const merged = {
    ...template,
  };
  if (typeof overlay.full_name === "string") merged.full_name = overlay.full_name;
  if (typeof overlay.role === "string") merged.role = overlay.role;
  if ("sms_region" in overlay) merged.sms_region = overlay.sms_region;
  if ("sms_district" in overlay) merged.sms_district = overlay.sms_district;
  if (typeof overlay.phone_e164 === "string") merged.phone_e164 = overlay.phone_e164;
  return merged;
}

/**
 * @param {Record<string, unknown>} templateMerged
 */
export function mergePresetIntoAuthRow(templateMerged) {
  const role = String(templateMerged.role ?? "");
  /** @type {Record<string, unknown>} */
  const row = {
    id: templateMerged.id,
    phone_e164:
      typeof templateMerged.phone_e164 === "string" && templateMerged.phone_e164.startsWith("+")
        ? templateMerged.phone_e164
        : "+251900000099",
    full_name: String(templateMerged.full_name ?? ""),
    role,
  };
  if (role === "kebele_worker") {
    const sr = templateMerged.sms_region;
    const sd = templateMerged.sms_district;
    if (typeof sr === "string" && sr.trim()) row.sms_region = sr.trim();
    const dn = typeof sd === "number" ? sd : Number(sd);
    if (Number.isInteger(dn) && dn >= 1 && dn <= 5) row.sms_district = dn;
  }
  return row;
}
