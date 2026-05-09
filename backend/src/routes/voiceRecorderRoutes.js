import { Router } from "express";
import { authenticateJwt, authorizeRoles } from "../middleware/authJwt.js";
import {
  approveVoiceTrack,
  deleteVoiceTrack,
  getVoiceJob,
  listVoiceJobsForDashboard,
  requestVoiceRerecord,
  submitApprovedToUssdIvr,
  uploadVoiceTrack,
  voiceJobPublicJson,
} from "../agriSms/voiceAdvisoryStore.js";

function scrubJob(job, opts) {
  if (!job) return null;
  return voiceJobPublicJson(job, opts);
}

export const voiceRecorderRouter = Router();

voiceRecorderRouter.use(authenticateJwt, authorizeRoles("voice_recorder_officer"));

voiceRecorderRouter.get("/jobs", (_req, res) => {
  const jobs = listVoiceJobsForDashboard().map((j) => scrubJob(j, { include_audio: false }));
  res.json({ ok: true, jobs });
});

voiceRecorderRouter.get("/jobs/:jobId", (req, res) => {
  const job = getVoiceJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: "not_found", message: "Voice job not found." });
  return res.json({ ok: true, job: scrubJob(job, { include_audio: true }) });
});

voiceRecorderRouter.put("/jobs/:jobId/track/:language", (req, res) => {
  try {
    const updated = uploadVoiceTrack(req.params.jobId, req.params.language, req.body ?? {});
    return res.json({ ok: true, job: scrubJob(updated, { include_audio: true }) });
  } catch (err) {
    return mapVoiceErr(res, err);
  }
});

voiceRecorderRouter.delete("/jobs/:jobId/track/:language", (req, res) => {
  try {
    const updated = deleteVoiceTrack(req.params.jobId, req.params.language);
    return res.json({ ok: true, job: scrubJob(updated, { include_audio: true }) });
  } catch (err) {
    return mapVoiceErr(res, err);
  }
});

voiceRecorderRouter.post("/jobs/:jobId/track/:language/approve", (req, res) => {
  try {
    const updated = approveVoiceTrack(req.params.jobId, req.params.language);
    return res.json({ ok: true, job: scrubJob(updated, { include_audio: true }) });
  } catch (err) {
    return mapVoiceErr(res, err);
  }
});

voiceRecorderRouter.post("/jobs/:jobId/track/:language/request-rerecord", (req, res) => {
  try {
    const updated = requestVoiceRerecord(req.params.jobId, req.params.language);
    return res.json({ ok: true, job: scrubJob(updated, { include_audio: true }) });
  } catch (err) {
    return mapVoiceErr(res, err);
  }
});

voiceRecorderRouter.post("/jobs/:jobId/submit-to-ussd", (req, res) => {
  try {
    const updated = submitApprovedToUssdIvr(req.params.jobId);
    return res.json({
      ok: true,
      job: scrubJob(updated, { include_audio: false }),
      ivr_dispatch: updated.ussd_sync_mock,
    });
  } catch (err) {
    return mapVoiceErr(res, err);
  }
});

function mapVoiceErr(res, err) {
  const c = err?.code ?? err?.message;
  switch (c) {
    case "NOT_FOUND":
      return res.status(404).json({ error: "not_found", message: typeof err.message === "string" ? err.message : "Not found." });
    case "BAD_LANG":
    case "EMPTY_AUDIO":
    case "NOT_APPROVABLE":
    case "NOT_ALL_APPROVED":
    case "NO_AUDIO":
      return res.status(400).json({ error: "bad_request", message: typeof err.message === "string" ? err.message : "Bad request." });
    case "AUDIO_TOO_LARGE":
      return res.status(413).json({ error: "audio_too_large", message: "Recording too large for demo buffer." });
    case "IMMUTABLE_SENT":
      return res.status(409).json({ error: "immutable", message: "Already dispatched to USSD/IVR." });
    case "PLATFORM_REVIEW_LOCK":
      return res.status(409).json({
        error: "platform_review_lock",
        message:
          typeof err.message === "string" ? err.message : "Queued for Super Administrator USSD publication; editing locked.",
      });
    default:
      console.error("[voice recorder]", err);
      return res.status(500).json({ error: "server_error", message: "Something went wrong." });
  }
}
