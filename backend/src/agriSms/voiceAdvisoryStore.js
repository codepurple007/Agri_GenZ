import { randomUUID } from "crypto";
import { agriSmsStore } from "./agriSmsStore.js";

export const VOICE_LANGS = /** @type {const} */ (["Amharic", "Oromo", "English"]);

export const TRACK_STATUS = /** @type {const} */ ({
  PENDING_RECORDING: "pending_recording",
  RECORDED: "recorded",
  REROLL_REQUESTED: "reroll_requested",
  APPROVED: "approved",
  SENT_TO_USSD: "sent_to_ussd",
});

/** Job-wide gate: voice officer queues pack; Super Admin releases to USSD (*850#). */
export const USSD_PUBLISH_STATUS = /** @type {const} */ ({
  NONE: "none",
  PENDING_SUPERADMIN: "pending_superadmin",
  LIVE: "live",
});

const MAX_B64_BYTES = 8 * 1024 * 1024;

/** @typedef {typeof TRACK_STATUS[keyof typeof TRACK_STATUS]} TrackStatus */

/** @type {Map<string, VoiceJob>} */
const jobsById = new Map();

/** @type {string | null} */
let activeJobId = null;

/**
 * @typedef {{
 *   status: TrackStatus,
 *   mime_type: string | null,
 *   audio_bytes_b64: string | null,
 *   recorded_at: string | null,
 *   approved_at: string | null,
 *   sent_at: string | null,
 * }} VoiceTrack
 */

/**
 * @typedef {{
 *   id: string,
 *   advisory_id: string,
 *   forwarded_at: string,
 *   forwarded_by: string | undefined,
 *   notes: string,
 *   season: string | undefined,
 *   texts: Record<string, string>,
 *   tracks: Record<string, VoiceTrack>,
 *   ussd_sync_mock: Record<string, unknown> | null,
 *   ussd_publish_status: typeof USSD_PUBLISH_STATUS[keyof typeof USSD_PUBLISH_STATUS],
 *   submitted_for_platform_review_at: string | null,
 *   review_rejection_note: string | null,
 *   review_rejected_at: string | null,
 * }} VoiceJob
 */

/** @returns {VoiceTrack} */
function blankTrack() {
  return {
    status: TRACK_STATUS.PENDING_RECORDING,
    mime_type: null,
    audio_bytes_b64: null,
    recorded_at: null,
    approved_at: null,
    sent_at: null,
  };
}

/** @returns {VoiceJob} */
/** @param {unknown} adv @param {string} key @param {string} lang */
function bundleLine(adv, key, lang) {
  const o = adv?.[key];
  if (o && typeof o === "object" && typeof o[lang] === "string") {
    const s = o[lang].trim();
    if (s) return s;
  }
  return "";
}

/** Full multilingual read-along (Voice / USSD) — fertilizer, outlook, rains, alerts, soil, crops, planting, market. */
export function snapshotAdvisoryTexts() {
  const adv = agriSmsStore.currentAdvisory;
  const fb = typeof adv?.fertilizer_by_lang === "object" ? adv.fertilizer_by_lang : {};
  const fo = typeof adv?.forecast_by_lang === "object" ? adv.forecast_by_lang : {};
  const texts = {};
  for (const lng of VOICE_LANGS) {
    const fertilizer = typeof fb[lng] === "string" ? fb[lng].trim() : "";
    const forecast = typeof fo[lng] === "string" ? fo[lng].trim() : "";
    const legF = String(adv?.fertilizer_recommendation ?? "").trim();
    const legFc = String(adv?.forecast_summary ?? "").trim();
    const fc = fertilizer || legF;
    const fy = forecast || legFc;

    const rainW = bundleLine(adv, "rain_window_display_by_lang", lng);
    const wx = bundleLine(adv, "weather_alert_by_lang", lng) || String(adv?.weather_alert ?? "").trim();
    const soilC = bundleLine(adv, "soil_condition_by_lang", lng);
    const soilPhL = bundleLine(adv, "soil_ph_by_lang", lng);
    const cropsBlk = bundleLine(adv, "crops_display_by_lang", lng);
    const plantL = bundleLine(adv, "planting_advice_by_lang", lng) || String(adv?.planting_advice ?? "").trim();
    const mkt = bundleLine(adv, "market_prices_display_by_lang", lng);

    const condShown = soilC || String(adv?.soil_condition ?? "").trim();
    const phShown = soilPhL || String(adv?.soil_ph ?? "").trim();
    let soilBody = "";
    if (condShown) soilBody += `· Condition: ${condShown}`;
    if (phShown) soilBody += (soilBody ? "\n" : "") + `· pH: ${phShown}`;
    const soilPart = soilBody ? `Soil\n${soilBody}` : "";

    const parts = [
      `Season\n· ${String(adv?.season ?? "").trim() || "—"}`,
      fc ? `Fertilizer\n· ${fc}` : "",
      fy ? `Rain / season outlook\n· ${fy}` : "",
      rainW ? `Rain start / end\n${rainW.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
      wx ? `Weather alert\n· ${wx}` : "",
      soilPart,
      cropsBlk ? `Crops\n${cropsBlk.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
      plantL ? `Planting advice\n· ${plantL}` : "",
      mkt ? `Market prices (ETB per quintal)\n${mkt.split("\n").map((ln) => `· ${ln}`).join("\n")}` : "",
    ].filter(Boolean);
    texts[lng] = parts.join("\n\n");
  }
  return texts;
}

/**
 * Forward current advisory multilingual text for IVR/USSD pipeline.
 * @param {{ notes?: string, forwarded_by?: string }}
 */
export function forwardAdvisoryToVoiceJobs({ notes, forwarded_by } = {}) {
  const texts = snapshotAdvisoryTexts();
  /** @type {VoiceJob} */
  const job = {
    id: randomUUID(),
    advisory_id: String(agriSmsStore.currentAdvisory?.id ?? "unknown"),
    forwarded_at: new Date().toISOString(),
    forwarded_by,
    notes: String(notes ?? "").trim(),
    season: typeof agriSmsStore.currentAdvisory?.season === "string" ? agriSmsStore.currentAdvisory.season : undefined,
    texts,
    tracks: {
      Amharic: blankTrack(),
      Oromo: blankTrack(),
      English: blankTrack(),
    },
    ussd_sync_mock: null,
    ussd_publish_status: USSD_PUBLISH_STATUS.NONE,
    submitted_for_platform_review_at: null,
    review_rejection_note: null,
    review_rejected_at: null,
  };
  jobsById.set(job.id, job);
  activeJobId = job.id;
  return job;
}

/** List jobs for Voice Recorder dashboard (reverse chrono). */
export function listVoiceJobsForDashboard() {
  return [...jobsById.values()].sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1));
}

export function getVoiceJob(jobId) {
  return jobsById.get(jobId) ?? null;
}

export function getActiveVoiceJob() {
  return activeJobId ? jobsById.get(activeJobId) ?? null : null;
}

function assertLang(lang) {
  const s = String(lang);
  if (!VOICE_LANGS.includes(s)) {
    const err = new Error("bad_lang");
    err.code = "BAD_LANG";
    throw err;
  }
  return /** @type {typeof VOICE_LANGS[number]} */ (s);
}

function decodeB64RoughLength(b64) {
  const len = typeof b64 === "string" ? b64.length : 0;
  return Math.ceil((len * 3) / 4);
}

/** @param {VoiceJob} job */
function assertOfficerMayEditVoiceJob(job) {
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    const e = new Error(
      "This pack is queued for Super Administrator release to USSD (*850#). Editing is locked until they reject or publish.",
    );
    e.code = "PLATFORM_REVIEW_LOCK";
    throw e;
  }
}

/**
 * @returns {VoiceJob}
 */
export function uploadVoiceTrack(jobId, langRaw, body) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("not_found");
    e.code = "NOT_FOUND";
    throw e;
  }
  assertOfficerMayEditVoiceJob(job);
  const lang = assertLang(langRaw);
  const mime_type = typeof body.mime_type === "string" ? body.mime_type.trim() : "audio/webm";
  const audio_base64 =
    typeof body.audio_base64 === "string"
      ? body.audio_base64.replace(/^data:[^;]+;base64,/, "")
      : "";
  if (!audio_base64) {
    const e = new Error("empty_audio");
    e.code = "EMPTY_AUDIO";
    throw e;
  }
  if (decodeB64RoughLength(audio_base64) > MAX_B64_BYTES) {
    const e = new Error("audio_too_large");
    e.code = "AUDIO_TOO_LARGE";
    throw e;
  }

  /** @type {VoiceTrack} */
  const track = job.tracks[lang];
  if (track.status === TRACK_STATUS.SENT_TO_USSD) {
    const e = new Error("immutable");
    e.code = "IMMUTABLE_SENT";
    throw e;
  }
  track.audio_bytes_b64 = audio_base64;
  track.mime_type = mime_type;
  track.status = TRACK_STATUS.RECORDED;
  track.recorded_at = new Date().toISOString();
  track.approved_at = null;
  return job;
}

export function deleteVoiceTrack(jobId, langRaw) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("not_found");
    e.code = "NOT_FOUND";
    throw e;
  }
  assertOfficerMayEditVoiceJob(job);
  const lang = assertLang(langRaw);
  const track = job.tracks[lang];
  if (track.status === TRACK_STATUS.SENT_TO_USSD) {
    const e = new Error("immutable");
    e.code = "IMMUTABLE_SENT";
    throw e;
  }
  track.audio_bytes_b64 = null;
  track.mime_type = null;
  track.recorded_at = null;
  track.approved_at = null;
  track.status = TRACK_STATUS.PENDING_RECORDING;
  return job;
}

export function approveVoiceTrack(jobId, langRaw) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("not_found");
    e.code = "NOT_FOUND";
    throw e;
  }
  assertOfficerMayEditVoiceJob(job);
  const lang = assertLang(langRaw);
  const track = job.tracks[lang];
  if (track.status !== TRACK_STATUS.RECORDED) {
    const e = new Error("not_ready");
    e.code = "NOT_APPROVABLE";
    throw e;
  }
  if (!track.audio_bytes_b64) {
    const e = new Error("no_audio");
    e.code = "NO_AUDIO";
    throw e;
  }
  track.status = TRACK_STATUS.APPROVED;
  track.approved_at = new Date().toISOString();
  return job;
}

/** Kebele or officer flags a language needing a new recording. */
export function requestVoiceRerecord(jobId, langRaw) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("not_found");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    const e = new Error(
      "Audio is queued for Super Administrator USSD publication. Flag re-record after they reject the pack, if needed.",
    );
    e.code = "PLATFORM_REVIEW_LOCK";
    throw e;
  }
  const lang = assertLang(langRaw);
  const track = job.tracks[lang];
  if (track.status === TRACK_STATUS.SENT_TO_USSD) {
    const e = new Error("immutable");
    e.code = "IMMUTABLE_SENT";
    throw e;
  }
  track.status = TRACK_STATUS.REROLL_REQUESTED;
  track.audio_bytes_b64 = null;
  track.mime_type = null;
  track.recorded_at = null;
  track.approved_at = null;
  return job;
}

/**
 * Voice Recorder Officers approve every language locally, then submit here.
 * Actual *850# / IVR placement happens only after {@link superadminPublishVoiceToUssd}.
 */
export function submitApprovedToUssdIvr(jobId) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("Voice job not found.");
    e.code = "NOT_FOUND";
    throw e;
  }

  /** Idempotent — fully live job. */
  let allDispatched = true;
  for (const lng of VOICE_LANGS) {
    if (job.tracks[lng].status !== TRACK_STATUS.SENT_TO_USSD) {
      allDispatched = false;
      break;
    }
  }
  if (allDispatched) {
    job.ussd_publish_status = USSD_PUBLISH_STATUS.LIVE;
    return job;
  }

  /** Idempotent — already waiting on Super Admin. */
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    return job;
  }

  const missingApprove = [];
  for (const lng of VOICE_LANGS) {
    const track = job.tracks[lng];
    if (track.status !== TRACK_STATUS.APPROVED) {
      missingApprove.push(lng);
    }
  }
  if (missingApprove.length > 0) {
    const e = new Error(
      "Approve all three languages (Amharic, Afaan Oromoo, English) before USSD submission — each track must show Approved.",
    );
    e.code = "NOT_ALL_APPROVED";
    throw e;
  }
  const now = new Date().toISOString();
  job.submitted_for_platform_review_at = now;
  job.ussd_publish_status = USSD_PUBLISH_STATUS.PENDING_SUPERADMIN;
  job.review_rejection_note = null;
  job.review_rejected_at = null;
  job.ussd_sync_mock = {
    pending_superadmin_review: true,
    ussd_star_code_hint: "*850#",
    job_id: job.id,
    advisory_id: job.advisory_id,
    queued_at: now,
    demo_note:
      "Voice officers approved audio. Pending Super Administrator sign-off — then bulletin goes to farmers’ USSD (*850# or district code).",
  };
  return job;
}

/** Super Admin listens to masters and publishes to mocked USSD/IVR. */
export function superadminPublishVoiceToUssd(jobId) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("Voice job not found.");
    e.code = "NOT_FOUND";
    throw e;
  }
  const allTracksOnUssd = VOICE_LANGS.every((lng) => job.tracks[lng].status === TRACK_STATUS.SENT_TO_USSD);
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.LIVE || allTracksOnUssd) {
    job.ussd_publish_status = USSD_PUBLISH_STATUS.LIVE;
    return job;
  }
  if (job.ussd_publish_status !== USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    const e = new Error("Nothing is waiting for USSD publication for this advisory pack.");
    e.code = "NOT_AWAITING_PUBLISH";
    throw e;
  }
  const now = new Date().toISOString();
  for (const lng of VOICE_LANGS) {
    const track = job.tracks[lng];
    if (track.status !== TRACK_STATUS.APPROVED) {
      const e = new Error("All languages must remain officer-approved before platform release.");
      e.code = "NOT_ALL_APPROVED";
      throw e;
    }
    track.status = TRACK_STATUS.SENT_TO_USSD;
    track.sent_at = now;
  }
  job.ussd_publish_status = USSD_PUBLISH_STATUS.LIVE;
  job.review_rejection_note = null;
  job.review_rejected_at = null;
  job.ussd_sync_mock = {
    pending_superadmin_review: false,
    ussd_star_code_hint: "*850#",
    job_id: job.id,
    advisory_id: job.advisory_id,
    synced_at: now,
    codecs_preferred: ["aac", "opus-in-webm", "mp3"],
    note:
      "Demo: payloads are mocked. Farmers dial district USSD codes (e.g. *850#) for bulletins matching the landing USSD workflow.",
  };
  return job;
}

/**
 * Return pack to Voice Recorder Officers — `body.feedback` is shown on their job detail (min length enforced).
 * @param {string} jobId
 * @param {{ feedback?: unknown, reviewer_feedback?: unknown }} [body]
 */
export function superadminRejectVoicePublication(jobId, body = {}) {
  const job = jobsById.get(jobId);
  if (!job) {
    const e = new Error("Voice job not found.");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (job.ussd_publish_status !== USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    const e = new Error("Nothing is waiting for USSD publication for this advisory pack.");
    e.code = "NOT_AWAITING_PUBLISH";
    throw e;
  }
  const raw =
    typeof body?.feedback === "string"
      ? body.feedback.trim()
      : typeof body?.reviewer_feedback === "string"
        ? body.reviewer_feedback.trim()
        : "";
  if (raw.length < 8) {
    const e = new Error(
      "Explain what needs fixing for the Voice Recorder Officers (at least 8 characters): e.g. wrong wording, clipped audio, noisy background.",
    );
    e.code = "INVALID_REJECT_FEEDBACK";
    throw e;
  }
  job.ussd_publish_status = USSD_PUBLISH_STATUS.NONE;
  job.submitted_for_platform_review_at = null;
  job.ussd_sync_mock = null;
  job.review_rejection_note = raw;
  job.review_rejected_at = new Date().toISOString();
  return job;
}

/** Super Admin inbox (newest first). */
export function listVoiceJobsAwaitingSuperadmin() {
  return [...jobsById.values()]
    .filter((j) => j.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN)
    .sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1));
}

/**
 * Normalize JSON for dashboards (Voice Recorder Officers + Super Admin).
 * @param {VoiceJob} job
 * @param {{ include_audio?: boolean }} [opts]
 */
export function voiceJobPublicJson(job, { include_audio: include_audio = false } = {}) {
  const tracks_out = {};
  for (const lng of VOICE_LANGS) {
    const tr = job.tracks[lng];
    const row = {
      status: tr.status,
      mime_type: tr.mime_type,
      recorded_at: tr.recorded_at,
      approved_at: tr.approved_at,
      sent_at: tr.sent_at,
    };
    if (include_audio && tr.mime_type && tr.audio_bytes_b64) {
      row.audio_src = `data:${tr.mime_type};base64,${tr.audio_bytes_b64}`;
    } else {
      row.has_audio = Boolean(tr.audio_bytes_b64);
    }
    tracks_out[lng] = row;
  }
  return {
    id: job.id,
    advisory_id: job.advisory_id,
    forwarded_at: job.forwarded_at,
    forwarded_by: job.forwarded_by,
    notes: job.notes,
    season: job.season,
    texts: job.texts,
    tracks: tracks_out,
    ussd_publish_status:
      job.ussd_publish_status ?? USSD_PUBLISH_STATUS.NONE,
    submitted_for_platform_review_at:
      job.submitted_for_platform_review_at ?? null,
    review_rejection_note:
      typeof job.review_rejection_note === "string" && job.review_rejection_note.trim()
        ? job.review_rejection_note.trim()
        : null,
    review_rejected_at: job.review_rejected_at ?? null,
    ussd_sync_mock: job.ussd_sync_mock,
  };
}

/** Kebele review card — keyed by advisory id visibility. */
export function getVoiceStatusForKebeleSummary() {
  const job =
    activeJobId && jobsById.get(activeJobId)
      ? jobsById.get(activeJobId)
      : [...jobsById.values()].sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1))[0];

  if (!job) return { ok: true, forwarded: false, job: null, tracks: {} };

  const tracks = {};
  for (const lng of VOICE_LANGS) {
    const t = job.tracks[lng];
    tracks[lng] = {
      status: t.status,
      has_audio: Boolean(t.audio_bytes_b64),
      recorded_at: t.recorded_at,
      approved_at: t.approved_at,
      sent_at: t.sent_at,
    };
  }
  return {
    ok: true,
    forwarded: true,
    job: {
      id: job.id,
      advisory_id: job.advisory_id,
      forwarded_at: job.forwarded_at,
      season: job.season,
      tracks,
      ussd_publish_status: job.ussd_publish_status ?? USSD_PUBLISH_STATUS.NONE,
      submitted_for_platform_review_at: job.submitted_for_platform_review_at ?? null,
      ussd_sync_mock: job.ussd_sync_mock,
    },
  };
}
