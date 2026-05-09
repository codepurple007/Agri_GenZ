/**
 * Demo voice advisory pipeline parity with backend/src/agriSms/voiceAdvisoryStore.js
 */
import type { AuthUser } from "@/auth/types";
import { ApiError } from "@/api/errors";
import { buildAdvisoryVoiceScript } from "@/agriSms/advisoryVoiceScript";

export const VOICE_LANGS = ["Amharic", "Oromo", "English"] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];

export const TRACK_STATUS = {
  PENDING_RECORDING: "pending_recording",
  RECORDED: "recorded",
  REROLL_REQUESTED: "reroll_requested",
  APPROVED: "approved",
  SENT_TO_USSD: "sent_to_ussd",
} as const;

export const USSD_PUBLISH_STATUS = {
  NONE: "none",
  PENDING_SUPERADMIN: "pending_superadmin",
  LIVE: "live",
} as const;

type TrackStatus = (typeof TRACK_STATUS)[keyof typeof TRACK_STATUS];
export type UssdPublishStatus = (typeof USSD_PUBLISH_STATUS)[keyof typeof USSD_PUBLISH_STATUS];

type VoiceTrack = {
  status: TrackStatus;
  mime_type: string | null;
  audio_bytes_b64: string | null;
  recorded_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
};

export type VoiceJob = {
  id: string;
  advisory_id: string;
  forwarded_at: string;
  forwarded_by?: string;
  notes: string;
  season?: string;
  texts: Record<VoiceLang, string>;
  tracks: Record<VoiceLang, VoiceTrack>;
  ussd_sync_mock: Record<string, unknown> | null;
  ussd_publish_status: UssdPublishStatus;
  submitted_for_platform_review_at: string | null;
  review_rejection_note: string | null;
  review_rejected_at: string | null;
};

const MAX_B64_BYTES = 8 * 1024 * 1024;

const jobsById = new Map<string, VoiceJob>();
let activeJobId: string | null = null;

function blankTrack(): VoiceTrack {
  return {
    status: TRACK_STATUS.PENDING_RECORDING,
    mime_type: null,
    audio_bytes_b64: null,
    recorded_at: null,
    approved_at: null,
    sent_at: null,
  };
}

function snapshotTexts(adv: Record<string, unknown>): Record<VoiceLang, string> {
  return buildAdvisoryVoiceScript(adv);
}

function assertOfficerMayEditJob(job: VoiceJob) {
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    throw new ApiError(
      409,
      "This pack is queued for Super Administrator release to USSD (*850#). Editing is locked until they reject or publish.",
      { error: "platform_review_lock" },
    );
  }
}

export function forwardVoiceJobFromAdvisory(
  advisory: Record<string, unknown>,
  opts: { forwarded_by?: string; notes?: string },
): VoiceJob {
  const texts = snapshotTexts(advisory);
  const job: VoiceJob = {
    id: crypto.randomUUID(),
    advisory_id: String(advisory?.id ?? "unknown"),
    forwarded_at: new Date().toISOString(),
    forwarded_by: opts.forwarded_by,
    notes: String(opts.notes ?? "").trim(),
    season: typeof advisory.season === "string" ? advisory.season : undefined,
    texts,
    tracks: { Amharic: blankTrack(), Oromo: blankTrack(), English: blankTrack() },
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

export function getActiveVoiceJob(): VoiceJob | null {
  if (!activeJobId) return null;
  return jobsById.get(activeJobId) ?? null;
}

function assertLang(lang: string): VoiceLang {
  if (!VOICE_LANGS.includes(lang as VoiceLang)) {
    throw new ApiError(400, "Invalid language.", { error: "bad_language" });
  }
  return lang as VoiceLang;
}

function decodeB64RoughLength(b64: string): number {
  return Math.ceil((b64.length * 3) / 4);
}

export function mockVoiceKebeleStatusPayload() {
  const job =
    activeJobId && jobsById.get(activeJobId)
      ? jobsById.get(activeJobId)!
      : [...jobsById.values()].sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1))[0];

  if (!job) return { ok: true, forwarded: false, job: null, tracks: {} };

  const tracks: Record<string, unknown> = {};
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
      ussd_publish_status: job.ussd_publish_status,
      submitted_for_platform_review_at: job.submitted_for_platform_review_at,
      ussd_sync_mock: job.ussd_sync_mock,
    },
    tracks,
  };
}

export function mockKebeleRequestVoiceRerecord(body: Record<string, unknown>) {
  let jobId = body.job_id != null ? String(body.job_id) : "";
  if (!jobId) {
    const j = getActiveVoiceJob();
    if (!j) throw new ApiError(400, "Nothing forwarded yet for voice conversion.", { error: "no_voice_job" });
    jobId = j.id;
  }
  const lang = assertLang(String(body.language ?? ""));
  const job = jobsById.get(jobId);
  if (!job) throw new ApiError(404, "Not found.", { error: "not_found" });
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    throw new ApiError(
      409,
      "Audio is queued for Super Administrator USSD publication. Request re-record only after they reject the pack.",
      { error: "platform_review_lock" },
    );
  }
  const track = job.tracks[lang];
  if (track.status === TRACK_STATUS.SENT_TO_USSD) {
    throw new ApiError(409, "Already dispatched.", { error: "immutable" });
  }
  track.status = TRACK_STATUS.REROLL_REQUESTED;
  track.audio_bytes_b64 = null;
  track.mime_type = null;
  track.recorded_at = null;
  track.approved_at = null;
  return mockVoiceKebeleStatusPayload();
}

function scrubTracks(job: VoiceJob, include_audio: boolean) {
  const tracks_out: Record<string, Record<string, unknown>> = {};
  for (const lng of VOICE_LANGS) {
    const tr = job.tracks[lng];
    const row: Record<string, unknown> = {
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
  return tracks_out;
}

function scrubJob(job: VoiceJob, include_audio: boolean) {
  return {
    id: job.id,
    advisory_id: job.advisory_id,
    forwarded_at: job.forwarded_at,
    forwarded_by: job.forwarded_by,
    notes: job.notes,
    season: job.season,
    texts: job.texts,
    tracks: scrubTracks(job, include_audio),
    ussd_publish_status: job.ussd_publish_status,
    submitted_for_platform_review_at: job.submitted_for_platform_review_at,
    review_rejection_note: job.review_rejection_note,
    review_rejected_at: job.review_rejected_at,
    ussd_sync_mock: job.ussd_sync_mock,
  };
}

function listVoiceJobsAwaitingSuperadminSorted(): VoiceJob[] {
  return [...jobsById.values()]
    .filter((j) => j.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN)
    .sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1));
}

function publishVoiceSuperadmin(jobId: string): VoiceJob {
  const job = jobsById.get(jobId);
  if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });

  const allTracksOnUssd = VOICE_LANGS.every((lng) => job.tracks[lng].status === TRACK_STATUS.SENT_TO_USSD);
  if (job.ussd_publish_status === USSD_PUBLISH_STATUS.LIVE || allTracksOnUssd) {
    job.ussd_publish_status = USSD_PUBLISH_STATUS.LIVE;
    return job;
  }

  if (job.ussd_publish_status !== USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    throw new ApiError(
      400,
      "Nothing is waiting for USSD publication for this advisory pack.",
      { error: "not_awaiting_publish" },
    );
  }
  const now = new Date().toISOString();
  for (const lng of VOICE_LANGS) {
    const t = job.tracks[lng];
    if (t.status !== TRACK_STATUS.APPROVED) {
      throw new ApiError(400, "All languages must remain officer-approved before platform release.", {
        error: "not_all_approved",
      });
    }
    t.status = TRACK_STATUS.SENT_TO_USSD;
    t.sent_at = now;
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
    note: "Farmers dial district USSD (e.g. *850#) for bulletins per the cooperative registration flow.",
  };
  return job;
}

function rejectVoiceSuperadmin(jobId: string, body: Record<string, unknown>): VoiceJob {
  const job = jobsById.get(jobId);
  if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
  if (job.ussd_publish_status !== USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
    throw new ApiError(
      400,
      "Nothing is waiting for USSD publication for this advisory pack.",
      { error: "not_awaiting_publish" },
    );
  }
  const raw =
    typeof body.feedback === "string"
      ? body.feedback.trim()
      : typeof body.reviewer_feedback === "string"
        ? body.reviewer_feedback.trim()
        : "";
  if (raw.length < 8) {
    throw new ApiError(
      400,
      "Explain what needs fixing for the Voice Recorder Officers (at least 8 characters): e.g. wrong wording, clipped audio, noisy background.",
      { error: "invalid_reject_feedback" },
    );
  }
  job.ussd_publish_status = USSD_PUBLISH_STATUS.NONE;
  job.submitted_for_platform_review_at = null;
  job.ussd_sync_mock = null;
  job.review_rejection_note = raw;
  job.review_rejected_at = new Date().toISOString();
  return job;
}

function requireVoiceRecorder(session: AuthUser | null): AuthUser {
  if (!session || session.role !== "voice_recorder_officer") {
    throw new ApiError(403, "Voice recorder officer session required.", { error: "forbidden" });
  }
  return session;
}

function requireSuperadminVoice(session: AuthUser | null): AuthUser {
  if (!session || session.role !== "superadmin") {
    throw new ApiError(403, "Super Administrator session required.", { error: "forbidden" });
  }
  return session;
}

export function tryHandleVoiceRecorderApi<T>(
  pathname: string,
  method: string,
  rawBody: string | undefined,
  parseJson: (b: string | undefined) => Record<string, unknown>,
  session: AuthUser | null,
): T | undefined {
  if (!pathname.startsWith("/api/v1/voice-recorder")) return undefined;
  requireVoiceRecorder(session);
  const json = parseJson(rawBody);
  const m = method.toUpperCase();

  if (m === "GET" && pathname === "/api/v1/voice-recorder/jobs") {
    const jobs = [...jobsById.values()]
      .sort((a, b) => (a.forwarded_at < b.forwarded_at ? 1 : -1))
      .map((j) => scrubJob(j, false));
    return { ok: true, jobs } as T;
  }

  const detail = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)$/);
  if (m === "GET" && detail) {
    const job = jobsById.get(decodeURIComponent(detail[1]));
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const putTrack = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)\/track\/([^/]+)$/);
  if (m === "PUT" && putTrack) {
    const jobId = decodeURIComponent(putTrack[1]);
    const lang = assertLang(decodeURIComponent(putTrack[2]));
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    assertOfficerMayEditJob(job);
    const mime_type =
      typeof json.mime_type === "string" && json.mime_type.trim() ? json.mime_type.trim() : "audio/webm";
    const audio_base64 =
      typeof json.audio_base64 === "string" ? json.audio_base64.replace(/^data:[^;]+;base64,/, "") : "";
    if (!audio_base64) throw new ApiError(400, "Missing audio.", { error: "empty_audio" });
    if (decodeB64RoughLength(audio_base64) > MAX_B64_BYTES) {
      throw new ApiError(413, "Recording too large for demo buffer.", { error: "audio_too_large" });
    }
    const track = job.tracks[lang];
    if (track.status === TRACK_STATUS.SENT_TO_USSD) {
      throw new ApiError(409, "Already dispatched.", { error: "immutable" });
    }
    track.audio_bytes_b64 = audio_base64;
    track.mime_type = mime_type;
    track.status = TRACK_STATUS.RECORDED;
    track.recorded_at = new Date().toISOString();
    track.approved_at = null;
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const delTrack = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)\/track\/([^/]+)$/);
  if (m === "DELETE" && delTrack) {
    const jobId = decodeURIComponent(delTrack[1]);
    const lang = assertLang(decodeURIComponent(delTrack[2]));
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    assertOfficerMayEditJob(job);
    const track = job.tracks[lang];
    if (track.status === TRACK_STATUS.SENT_TO_USSD) {
      throw new ApiError(409, "Already dispatched.", { error: "immutable" });
    }
    track.audio_bytes_b64 = null;
    track.mime_type = null;
    track.recorded_at = null;
    track.approved_at = null;
    track.status = TRACK_STATUS.PENDING_RECORDING;
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const appr = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)\/track\/([^/]+)\/approve$/);
  if (m === "POST" && appr) {
    const jobId = decodeURIComponent(appr[1]);
    const lang = assertLang(decodeURIComponent(appr[2]));
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    assertOfficerMayEditJob(job);
    const track = job.tracks[lang];
    if (track.status !== TRACK_STATUS.RECORDED) {
      throw new ApiError(400, "Track is not recorded.", { error: "not_approvable" });
    }
    if (!track.audio_bytes_b64) throw new ApiError(400, "No audio.", { error: "no_audio" });
    track.status = TRACK_STATUS.APPROVED;
    track.approved_at = new Date().toISOString();
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const rer = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)\/track\/([^/]+)\/request-rerecord$/);
  if (m === "POST" && rer) {
    const jobId = decodeURIComponent(rer[1]);
    const lang = assertLang(decodeURIComponent(rer[2]));
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    assertOfficerMayEditJob(job);
    const track = job.tracks[lang];
    if (track.status === TRACK_STATUS.SENT_TO_USSD) {
      throw new ApiError(409, "Already dispatched.", { error: "immutable" });
    }
    track.status = TRACK_STATUS.REROLL_REQUESTED;
    track.audio_bytes_b64 = null;
    track.mime_type = null;
    track.recorded_at = null;
    track.approved_at = null;
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const submit = pathname.match(/^\/api\/v1\/voice-recorder\/jobs\/([^/]+)\/submit-to-ussd$/);
  if (m === "POST" && submit) {
    const jobId = decodeURIComponent(submit[1]);
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });

    let allDispatched = true;
    for (const lng of VOICE_LANGS) {
      if (job.tracks[lng].status !== TRACK_STATUS.SENT_TO_USSD) allDispatched = false;
    }
    if (allDispatched) {
      job.ussd_publish_status = USSD_PUBLISH_STATUS.LIVE;
      return {
        ok: true,
        job: scrubJob(job, false),
        ivr_dispatch: job.ussd_sync_mock ?? {},
      } as T;
    }

    if (job.ussd_publish_status === USSD_PUBLISH_STATUS.PENDING_SUPERADMIN) {
      return {
        ok: true,
        job: scrubJob(job, false),
        ivr_dispatch: job.ussd_sync_mock ?? {},
      } as T;
    }

    for (const lng of VOICE_LANGS) {
      if (job.tracks[lng].status !== TRACK_STATUS.APPROVED) {
        throw new ApiError(
          400,
          "Approve all three languages (Amharic, Afaan Oromoo, English) before USSD submission.",
          { error: "not_all_approved" },
        );
      }
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
    return { ok: true, job: scrubJob(job, false), ivr_dispatch: job.ussd_sync_mock } as T;
  }

  return undefined;
}

export function tryHandleSuperadminVoiceJobsApi<T>(
  pathname: string,
  method: string,
  rawBody: string | undefined,
  parseJson: (b: string | undefined) => Record<string, unknown>,
  session: AuthUser | null,
): T | undefined {
  if (!pathname.startsWith("/api/v1/superadmin/voice-jobs")) return undefined;
  requireSuperadminVoice(session);

  const m = method.toUpperCase();
  const json = parseJson(rawBody);

  if (m === "GET" && pathname === "/api/v1/superadmin/voice-jobs/pending") {
    const jobs = listVoiceJobsAwaitingSuperadminSorted().map((j) => scrubJob(j, false));
    return { ok: true, jobs } as T;
  }

  const one = pathname.match(/^\/api\/v1\/superadmin\/voice-jobs\/([^/]+)$/);
  if (m === "GET" && one) {
    const jobId = decodeURIComponent(one[1]);
    const job = jobsById.get(jobId);
    if (!job) throw new ApiError(404, "Voice job not found.", { error: "not_found" });
    return { ok: true, job: scrubJob(job, true) } as T;
  }

  const pub = pathname.match(/^\/api\/v1\/superadmin\/voice-jobs\/([^/]+)\/publish-ussd$/);
  if (m === "POST" && pub) {
    const updated = publishVoiceSuperadmin(decodeURIComponent(pub[1]));
    return { ok: true, job: scrubJob(updated, false), ivr_dispatch: updated.ussd_sync_mock } as T;
  }

  const rej = pathname.match(/^\/api\/v1\/superadmin\/voice-jobs\/([^/]+)\/reject-ussd$/);
  if (m === "POST" && rej) {
    const updated = rejectVoiceSuperadmin(decodeURIComponent(rej[1]), json);
    return { ok: true, job: scrubJob(updated, false) } as T;
  }

  return undefined;
}
