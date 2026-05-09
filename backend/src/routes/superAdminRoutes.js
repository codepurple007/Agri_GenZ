import { Router } from "express";
import { authenticateJwt, authorizeRoles } from "../middleware/authJwt.js";
import {
  builtinPresetOccupiesUsername,
  mergeStaffAccountsForSuperAdminListing,
} from "../data/presetSmsStaffListing.js";
import {
  deactivateBuiltinPresetStaff,
  isBuiltinPresetStaffPatchable,
  patchBuiltinPresetStaff,
} from "../data/superAdminPresetStaffOverlay.js";
import {
  provisionStaffInsert,
  provisionStaffListPublic,
  provisionStaffFind,
  provisionStaffPatch,
  provisionStaffRemove,
} from "../data/provisionedStaffStore.js";
import {
  getVoiceJob,
  listVoiceJobsAwaitingSuperadmin,
  voiceJobPublicJson,
  superadminPublishVoiceToUssd,
  superadminRejectVoicePublication,
} from "../agriSms/voiceAdvisoryStore.js";

export const superAdminRouter = Router();

superAdminRouter.use(authenticateJwt, authorizeRoles("superadmin"));

superAdminRouter.get("/staff-accounts", (_req, res) => {
  const accounts = mergeStaffAccountsForSuperAdminListing(provisionStaffListPublic());
  res.json({ ok: true, accounts });
});

superAdminRouter.post("/staff-accounts", (req, res) => {
  try {
    const { username, password, role, fullName, sms_region, sms_district } = req.body ?? {};
    const u = String(username ?? "").trim().toLowerCase();
    const r = String(role ?? "").trim();
    if (r !== "kebele_worker" && r !== "voice_recorder_officer") {
      return res.status(400).json({
        error: "invalid_role",
        message: "Only kebele_worker or voice_recorder_officer can be provisioned here.",
      });
    }

    if (builtinPresetOccupiesUsername(u)) {
      return res.status(409).json({
        error: "username_taken",
        message: "Built-in preset account still active — delete it first or pick another username.",
      });
    }
    if (provisionStaffFind(u)) {
      return res.status(409).json({ error: "username_taken", message: "Username already taken." });
    }

    const initialPw = String(password ?? "").trim() || `demo-${Math.random().toString(36).slice(2, 10)}`;
    const row = provisionStaffInsert({
      username: u,
      password: initialPw,
      role: r,
      fullName,
      sms_region,
      sms_district,
    });
    res.status(201).json({
      ok: true,
      account: {
        id: row.id,
        username: row.username_lc,
        full_name: row.full_name,
        role: row.role,
        sms_region: row.sms_region ?? null,
        sms_district: row.sms_district ?? null,
        source: "superadmin_provisioned",
      },
      initial_password_shown_once: initialPw,
      credential_note: "Save this password now; it will not be returned again.",
    });
  } catch (err) {
    if (err?.code === "USERNAME_TAKEN") {
      return res.status(409).json({ error: "username_taken", message: "Username already taken." });
    }
    console.error("[superadmin]", err);
    return res.status(400).json({ error: "bad_request", message: "Could not create account." });
  }
});

function mapStaffMgmtErr(res, err) {
  switch (err?.code ?? err?.message) {
    case "NOT_BUILTIN_PRESET":
      return res.status(400).json({ error: "not_builtin_preset", message: "This account cannot be patched as builtin." });
    case "DEACTIVATED_PRESET":
      return res.status(410).json({ error: "deactivated_preset", message: "This builtin preset is deactivated." });
    case "NOT_FOUND":
      return res.status(404).json({ error: "not_found", message: "Account not found." });
    case "BAD_PASSWORD_LEN":
      return res.status(400).json({ error: "bad_password", message: "Password must be at least 8 characters or omitted." });
    case "INVALID_REGION_STATE":
      return res.status(400).json({ error: "invalid_region_state", message: "Pick a valid kebele unit id." });
    case "INVALID_DISTRICT":
      return res.status(400).json({ error: "invalid_district", message: "Pick district 1–5." });
    default:
      console.error("[superadmin]", err);
      return res.status(400).json({ error: "bad_request", message: "Could not update account." });
  }
}

superAdminRouter.put("/staff-accounts/:username", (req, res) => {
  const u = String(req.params.username ?? "").trim().toLowerCase();
  if (!u) {
    return res.status(400).json({ error: "bad_request", message: "Username required." });
  }
  try {
    /** @type {Record<string, unknown>} */
    const bodyFields = {};
    const b = req.body ?? {};

    const fn = typeof b.fullName === "string" ? b.fullName : undefined;
    if (fn !== undefined) bodyFields.fullName = fn;

    if (typeof b.password === "string") bodyFields.password = b.password;
    if (typeof b.phone === "string") bodyFields.phone = b.phone;
    if (typeof b.role === "string") bodyFields.role = b.role.trim();
    if (typeof b.sms_region === "string") bodyFields.sms_region = b.sms_region;
    if ("sms_district" in b) bodyFields.sms_district = b.sms_district;

    if (isBuiltinPresetStaffPatchable(u)) {
      patchBuiltinPresetStaff(u, bodyFields);
    } else if (provisionStaffFind(u)) {
      provisionStaffPatch(u, bodyFields);
    } else {
      return res.status(404).json({ error: "not_found", message: "Account not found." });
    }

    const accounts = mergeStaffAccountsForSuperAdminListing(provisionStaffListPublic());
    const row = accounts.find((a) => a.username === u) ?? null;
    return res.json({ ok: true, account: row });
  } catch (err) {
    return mapStaffMgmtErr(res, err);
  }
});

superAdminRouter.delete("/staff-accounts/:username", (req, res) => {
  const u = String(req.params.username ?? "").trim().toLowerCase();
  try {
    if (!u) {
      return res.status(400).json({ error: "bad_request", message: "Username required." });
    }
    if (isBuiltinPresetStaffPatchable(u)) {
      deactivateBuiltinPresetStaff(u);
    } else if (provisionStaffFind(u)) {
      provisionStaffRemove(u);
    } else {
      return res.status(404).json({ error: "not_found", message: "Account not found." });
    }
    return res.json({ ok: true });
  } catch (err) {
    return mapStaffMgmtErr(res, err);
  }
});

superAdminRouter.get("/voice-jobs/pending", (_req, res) => {
  const jobs = listVoiceJobsAwaitingSuperadmin().map((j) => voiceJobPublicJson(j, { include_audio: false }));
  res.json({ ok: true, jobs });
});

superAdminRouter.get("/voice-jobs/:jobId", (req, res) => {
  const job = getVoiceJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "not_found", message: "Voice job not found." });
  try {
    return res.json({
      ok: true,
      job: voiceJobPublicJson(job, { include_audio: true }),
    });
  } catch (_e) {
    return res.status(500).json({ error: "server_error", message: "Could not serialize job." });
  }
});

superAdminRouter.post("/voice-jobs/:jobId/publish-ussd", (req, res) => {
  try {
    const updated = superadminPublishVoiceToUssd(req.params.jobId);
    return res.json({
      ok: true,
      job: voiceJobPublicJson(updated, { include_audio: false }),
      ivr_dispatch: updated.ussd_sync_mock,
    });
  } catch (err) {
    return mapSuperadminVoiceErr(res, err);
  }
});

superAdminRouter.post("/voice-jobs/:jobId/reject-ussd", (req, res) => {
  try {
    const updated = superadminRejectVoicePublication(req.params.jobId, req.body ?? {});
    return res.json({ ok: true, job: voiceJobPublicJson(updated, { include_audio: false }) });
  } catch (err) {
    return mapSuperadminVoiceErr(res, err);
  }
});

function mapSuperadminVoiceErr(res, err) {
  const c = err?.code ?? err?.message;
  switch (c) {
    case "NOT_FOUND":
      return res.status(404).json({ error: "not_found", message: typeof err.message === "string" ? err.message : "Not found." });
    case "NOT_AWAITING_PUBLISH":
      return res.status(400).json({
        error: "not_awaiting_publish",
        message: typeof err.message === "string" ? err.message : "Nothing is queued for USSD publication.",
      });
    case "NOT_ALL_APPROVED":
      return res.status(400).json({
        error: "bad_request",
        message: typeof err.message === "string" ? err.message : "Officer approvals incomplete.",
      });
    case "INVALID_REJECT_FEEDBACK":
      return res.status(400).json({
        error: "invalid_reject_feedback",
        message:
          typeof err.message === "string" ? err.message : "Provide feedback for Voice Recorder Officers (min 8 characters).",
      });
    default:
      console.error("[superadmin voice]", err);
      return res.status(500).json({ error: "server_error", message: "Something went wrong." });
  }
});
