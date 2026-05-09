/**
 * Public rows for Super Admin roster — matches demo SMS preset staff (`authService` + overlays).
 */

import {
  builtinPresetOccupiesUsername,
  isBuiltinPresetStaffDeactivated,
  mergePresetTemplateForListing,
} from "./superAdminPresetStaffOverlay.js";

/** @typedef {{ id: string, username: string, phone_e164: string, full_name: string, role: string, sms_region: string|null, sms_district: number|null, source: string }} StaffListingRow */

/** @type {StaffListingRow[]} */
export const PRESET_SMS_PRESET_ROWS = [
  {
    id: "66666666-6666-6666-6666-666666666666",
    username: "kebele",
    phone_e164: "+251900000006",
    full_name: "Almaz D. (Kebele worker)",
    role: "kebele_worker",
    sms_region: "kebele_3",
    sms_district: 3,
    source: "demo_builtin",
  },
  {
    id: "99999999-9999-9999-9999-999999999999",
    username: "gameda",
    phone_e164: "+251900000009",
    full_name: "Gameda B.",
    role: "kebele_worker",
    sms_region: "kebele_4",
    sms_district: 2,
    source: "demo_builtin",
  },
  {
    id: "77777777-7777-7777-7777-777777777777",
    username: "voice",
    phone_e164: "+251900000007",
    full_name: "Voice Recorder Officer (demo)",
    role: "voice_recorder_officer",
    sms_region: null,
    sms_district: null,
    source: "demo_builtin",
  },
];

/** Builtin SMS preset staff only (omit deactivated overlays). */

/** @returns {StaffListingRow[]} */
export function listPresetSmsStaffAccountsForSuperAdmin() {
  return PRESET_SMS_PRESET_ROWS.filter((row) => !isBuiltinPresetStaffDeactivated(row.username)).map((t) =>
    mergePresetTemplateForListing({ ...t }),
  );
}

/**
 * @param {StaffListingRow[]} provisioned
 * @returns {StaffListingRow[]}
 */
export function mergeStaffAccountsForSuperAdminListing(provisioned) {
  const keyed = new Map();
  for (const a of listPresetSmsStaffAccountsForSuperAdmin()) keyed.set(a.username, { ...a });
  for (const a of provisioned) keyed.set(a.username, { ...a });
  return [...keyed.values()].sort((a, b) => a.username.localeCompare(b.username));
}

export { builtinPresetOccupiesUsername };
