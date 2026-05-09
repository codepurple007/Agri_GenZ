import { keyframes } from "@emotion/react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { apiFetch } from "@/api/client";

const LANGS = ["Amharic", "Oromo", "English"] as const;

type TrackState = {
  status: string;
  mime_type?: string | null;
  audio_src?: string;
  has_audio?: boolean;
};

type VoiceJobDetail = {
  id: string;
  advisory_id: string;
  forwarded_at: string;
  season?: string;
  texts?: Record<string, string>;
  tracks: Record<string, TrackState>;
  ussd_publish_status?: "none" | "pending_superadmin" | "live";
  submitted_for_platform_review_at?: string | null;
  review_rejection_note?: string | null;
  review_rejected_at?: string | null;
  ussd_sync_mock?: Record<string, unknown> | null;
};

function pickMime(): string {
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const x of c) {
    try {
      if (MediaRecorder.isTypeSupported(x)) return x;
    } catch {
      /* ignore */
    }
  }
  return "";
}

function blobToPayload(blob: Blob) {
  return new Promise<{ mime_type: string; audio_base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onloadend = () => {
      const raw = String(reader.result ?? "");
      const idx = raw.indexOf("base64,");
      if (idx < 0) {
        reject(new Error("bad_data_url"));
        return;
      }
      resolve({
        mime_type: blob.type || "audio/webm",
        audio_base64: raw.slice(idx + 7),
      });
    };
    reader.readAsDataURL(blob);
  });
}

const pulseGlow = keyframes`
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.55);
    transform: scale(1);
  }
  50% {
    opacity: 0.88;
    box-shadow: 0 0 0 8px rgba(229, 62, 62, 0);
    transform: scale(1.06);
  }
`;

function RecordingLiveHint() {
  return (
    <HStack
      flexShrink={0}
      spacing={2}
      align="center"
      bg="red.600"
      color="white"
      px={3}
      py={2}
      borderRadius="md"
      aria-live="polite"
    >
      <Box
        w={2}
        h={2}
        borderRadius="full"
        bg="white"
        sx={{ animation: `${pulseGlow} 1.1s ease-in-out infinite` }}
      />
      <Text fontSize="xs" fontWeight="bold" letterSpacing="wide">
        REC
      </Text>
    </HStack>
  );
}

function statusPretty(s: string): string {
  switch (s) {
    case "pending_recording":
      return "Pending recording";
    case "recorded":
      return "Recorded";
    case "reroll_requested":
      return "Re-record requested";
    case "approved":
      return "Approved";
    case "sent_to_ussd":
      return "Sent to USSD/IVR";
    default:
      return s;
  }
}

export function VoiceRecorderJobPage() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const toast = useToast();
  const [job, setJob] = useState<VoiceJobDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  /** Language currently being recorded — global so only one track records at a time. */
  const [recordingLang, setRecordingLang] = useState<string | null>(null);
  const [busyLng, setBusyLng] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const path = `/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}`;
    const data = await apiFetch<{ ok: boolean; job: VoiceJobDetail }>(path);
    setJob(data.job);
  }, [jobId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await reload();
      } catch (e) {
        if (!cancel) setLoadErr(e instanceof ApiError ? e.message : "Load failed.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [reload]);

  async function wrap<T>(lng: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusyLng(lng);
    try {
      return await fn();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Failed." });
      return undefined;
    } finally {
      setBusyLng(null);
    }
  }

  async function startRec(lng: string) {
    if (recordingLang) {
      toast({ status: "warning", title: "Stop the current recording first." });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({
        status: "warning",
        title: "Recording not supported here",
        description: "Use a modern desktop browser over HTTPS.",
      });
      return;
    }
    const mime = pickMime();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data?.size) chunksRef.current.push(ev.data);
      };
      rec.addEventListener("stop", () => stream.getTracks().forEach((tr) => tr.stop()), { once: true });
      rec.start();
      setRecordingLang(lng);
      toast({ status: "info", title: `Recording ${lng}…` });
    } catch {
      toast({ status: "error", title: "Microphone denied or unavailable." });
    }
  }

  async function stopAndUpload(lng: string) {
    const rec = mediaRef.current;
    if (!rec) return;
    setRecordingLang(null);
    await new Promise<void>((resolve) => {
      rec.addEventListener("stop", () => resolve(), { once: true });
      try {
        if (rec.state === "recording" && typeof rec.requestData === "function") {
          rec.requestData();
        }
      } catch {
        /* ignore */
      }
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    mediaRef.current = null;
    const mimeUsed = rec.mimeType || pickMime() || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeUsed });
    chunksRef.current = [];
    const payload = await blobToPayload(blob);
    await wrap(lng, async () => {
      await apiFetch(`/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}/track/${encodeURIComponent(lng)}`, {
        method: "PUT",
        body: JSON.stringify({ mime_type: payload.mime_type, audio_base64: payload.audio_base64 }),
      });
      await reload();
      toast({ status: "success", title: "Uploaded." });
    });
  }

  async function deleteTrack(lng: string) {
    await wrap(lng, async () => {
      await apiFetch(`/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}/track/${encodeURIComponent(lng)}`, {
        method: "DELETE",
      });
      await reload();
      toast({ status: "success", title: "Recording cleared." });
    });
  }

  async function approveTrack(lng: string) {
    await wrap(lng, async () => {
      await apiFetch(
        `/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}/track/${encodeURIComponent(lng)}/approve`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await reload();
      toast({ status: "success", title: "Approved." });
    });
  }

  async function requestRerecord(lng: string) {
    await wrap(lng, async () => {
      await apiFetch(
        `/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}/track/${encodeURIComponent(lng)}/request-rerecord`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await reload();
    });
  }

  async function submitUssd() {
    setBusyLng("__submit");
    try {
      const data = await apiFetch<{
        ivr_dispatch?: Record<string, unknown>;
      }>(`/api/v1/voice-recorder/jobs/${encodeURIComponent(jobId)}/submit-to-ussd`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await reload();
      toast({
        status: "success",
        title: "Sent to Super Admin for USSD release",
        description: "After they publish, farmers can use *850# (or their district cooperative code).",
      });
      if (data.ivr_dispatch) console.debug("[ivr]", data.ivr_dispatch);
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Submit failed." });
    } finally {
      setBusyLng(null);
    }
  }

  if (loadErr) return <Text color="red.600">{loadErr}</Text>;
  if (!job) return <Text fontSize="sm">Loading…</Text>;

  const allApproved = LANGS.every((lng) => job.tracks[lng]?.status === "approved");
  const dispatched =
    job.ussd_publish_status === "live" || LANGS.every((lng) => job.tracks[lng]?.status === "sent_to_ussd");
  const pendingSaReview = job.ussd_publish_status === "pending_superadmin";

  return (
    <Stack spacing={6}>
      <HStack spacing={4} flexWrap="wrap">
        <Button as={RouterLink} to="/voice-recorder" size="sm" variant="outline">
          ← Jobs
        </Button>
        <Heading size="md" color="purple.900">
          Job {job.season ?? job.advisory_id}
        </Heading>
      </HStack>
      <Text fontSize="xs" color="gray.600">
        Forwarded {new Date(job.forwarded_at).toLocaleString()}
      </Text>
      {job.review_rejection_note ? (
        <Alert status="error" borderRadius="md" fontSize="sm" variant="subtle">
          <AlertIcon />
          <Stack spacing={2} align="stretch">
            <Text fontWeight="bold">Super Administrator revision request</Text>
            {job.review_rejected_at ? (
              <Text fontSize="xs" color="gray.600">
                Returned {new Date(job.review_rejected_at).toLocaleString()}
              </Text>
            ) : null}
            <Text whiteSpace="pre-wrap" fontSize="sm">
              {job.review_rejection_note}
            </Text>
            <Text fontSize="xs" color="gray.600">
              Re-listen to each language’s audio below, edit or re-record as needed, then approve all three languages and send
              again for platform review. This message clears after a successful re-queue.
            </Text>
          </Stack>
        </Alert>
      ) : null}
      {pendingSaReview ? (
        <Alert status="warning" borderRadius="md" fontSize="sm">
          <AlertIcon />
          Queued with the Super Administrator — they review audio masters and publish to USSD (<em>*850#</em> or your
          district cooperative code). Editing this job is locked until they publish or reject it.
        </Alert>
      ) : null}
      {dispatched && !pendingSaReview ? (
        <Alert status="success" borderRadius="md" fontSize="sm">
          <AlertIcon />
          Live on USSD stack (demo): farmers dial{" "}
          <strong>{(job.ussd_sync_mock as { ussd_star_code_hint?: string } | undefined)?.ussd_star_code_hint ?? "*850#"}</strong>{" "}
          and follow the landing-page flow — language menu, bulletin playback, optional question.
        </Alert>
      ) : null}

      <Tabs variant="enclosed" colorScheme="purple" size="sm">
        <TabList flexWrap="wrap">
          {LANGS.map((lng) => (
            <Tab key={lng}>{lng === "Oromo" ? "Afaan Oromoo" : lng}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {LANGS.map((lng) => {
            const tr = job.tracks[lng] ?? { status: "pending_recording" };
            const txt = job.texts?.[lng] ?? "";
            const canApprove = tr.status === "recorded";
            const isSent = tr.status === "sent_to_ussd";
            const officerLocked = pendingSaReview || isSent;

            return (
              <TabPanel key={lng} px={{ base: 0, md: 2 }}>
                <Stack spacing={4}>
                  <Flex
                    align="flex-start"
                    gap={3}
                    bg="purple.50"
                    p={3}
                    borderRadius="md"
                    borderWidth={recordingLang === lng ? "2px" : "0"}
                    borderColor={recordingLang === lng ? "red.400" : "transparent"}
                  >
                    <Text fontSize="xs" whiteSpace="pre-wrap" flex="1" minW={0}>
                      {txt || "(No advisory text captured.)"}
                    </Text>
                    {recordingLang === lng ? <RecordingLiveHint /> : null}
                  </Flex>
                  <Text fontSize="sm" fontWeight="semibold">
                    Status: {statusPretty(tr.status)}
                  </Text>
                  {tr.audio_src ? <audio controls src={tr.audio_src} style={{ width: "100%", maxHeight: 48 }} /> : null}

                  {!officerLocked ? (
                    <Stack spacing={2}>
                      {recordingLang !== lng ? (
                        <Button
                          colorScheme="purple"
                          size="sm"
                          maxW="xs"
                          onClick={() => void startRec(lng)}
                          isDisabled={
                            busyLng !== null || tr.status === "sent_to_ussd" || (recordingLang != null && recordingLang !== lng)
                          }
                        >
                          Record
                        </Button>
                      ) : (
                        <Button
                          colorScheme="orange"
                          size="sm"
                          maxW="xs"
                          onClick={() => void stopAndUpload(lng)}
                          isLoading={busyLng === lng}
                        >
                          Stop & upload
                        </Button>
                      )}
                      <HStack flexWrap="wrap" spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void deleteTrack(lng)}
                          isDisabled={busyLng !== null || !tr.has_audio}
                        >
                          Delete recording
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="green"
                          variant="outline"
                          onClick={() => void approveTrack(lng)}
                          isDisabled={!canApprove || busyLng !== null}
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void requestRerecord(lng)} isDisabled={busyLng !== null}>
                          Flag re-record
                        </Button>
                      </HStack>
                    </Stack>
                  ) : (
                    <Text fontSize="sm" color="gray.600">
                      {pendingSaReview
                        ? "Locked — Super Administrator is reviewing for *850# release."
                        : "This language is locked after USSD publication."}
                    </Text>
                  )}
                </Stack>
              </TabPanel>
            );
          })}
        </TabPanels>
      </Tabs>

      <Divider />

      {!dispatched ? (
        <Stack spacing={2} maxW="md">
          {!allApproved && job ? (
            <Text fontSize="xs" color="gray.600">
              Approve each language after upload (before sending to Super Admin):{" "}
              <strong>{LANGS.filter((l) => job.tracks[l]?.status !== "approved").join(", ") || "—"}</strong> still not
              approved.
            </Text>
          ) : null}
          {recordingLang ? (
            <Text fontSize="xs" color="orange.700">
              Finish or upload the active recording before sending to Super Admin.
            </Text>
          ) : null}
          {pendingSaReview ? (
            <Text fontSize="sm" color="gray.700">
              Waiting for Super Admin to publish dial-in bulletins to USSD (<em>*850#</em> demo).
            </Text>
          ) : (
            <Button
              colorScheme="purple"
              maxW="md"
              onClick={() => void submitUssd()}
              isDisabled={!allApproved || busyLng !== null || recordingLang !== null}
              isLoading={busyLng === "__submit"}
            >
              Send to Super Admin for USSD publication
            </Button>
          )}
        </Stack>
      ) : (
        <Text fontSize="sm" color="green.700">
          Live on USSD (demo): farmers dial the cooperative short code (e.g. <strong>*850#</strong>), pick a language, and hear
          this bulletin—as on the landing “Use USSD” guide.
        </Text>
      )}
    </Stack>
  );
}
