/**
 * Shared demo-login resolution for sms preset clerks (`kebele`, `gameda`, `voice`).
 */
import {
  mergePresetIntoAuthRow,
  mergePresetTemplateForListing,
  presetPasswordEffective,
  isBuiltinPresetStaffDeactivated,
} from "../data/superAdminPresetStaffOverlay.js";
import { PRESET_SMS_PRESET_ROWS } from "../data/presetSmsStaffListing.js";

/**
 * Successful login JWT row (`staffUserJson`/`signToken` shape); null if credentials wrong or deactivated.
 *
 * @param {string} usernameLc
 * @param {string} plainPassword
 * @returns {Record<string, unknown> | null}
 */
export function authenticateSmsPresetStaffLogin(usernameLc, plainPassword) {
  const t = PRESET_SMS_PRESET_ROWS.find((x) => x.username === usernameLc);
  if (!t || isBuiltinPresetStaffDeactivated(usernameLc)) return null;

  /** @type {string} */
  let fallback = "demo";
  if (usernameLc === "kebele") fallback = process.env.DEMO_KEBELE_PASSWORD ?? "demo";
  else if (usernameLc === "gameda") fallback = process.env.DEMO_GAMEDA_PASSWORD ?? "demo";
  else if (usernameLc === "voice") fallback = process.env.DEMO_VOICE_PASSWORD ?? "demo";

  const expected = presetPasswordEffective(usernameLc, fallback);
  if (expected !== plainPassword) return null;

  const mergedListing = mergePresetTemplateForListing({ ...t });
  return mergePresetIntoAuthRow(mergedListing);
}
