import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";

const LANGS = ["Amharic", "Oromo", "English"] as const;
const MIN_FEEDBACK_CHARS = 8;

type PendingRow = {
  id: string;
  advisory_id: string;
  forwarded_at: string;
  season?: string;
  submitted_for_platform_review_at?: string | null;
};

type TrackRow = {
  status: string;
  audio_src?: string;
  has_audio?: boolean;
};

type JobDetail = PendingRow & {
  texts?: Record<string, string>;
  tracks: Record<string, TrackRow>;
  ussd_sync_mock?: Record<string, unknown> | null;
};

export function SuperAdminVoiceUssdPage() {
  const toast = useToast();
  const rejectDlg = useDisclosure();
  const [pending, setPending] = useState<PendingRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const loadPending = useCallback(async () => {
    const data = await apiFetch<{ ok: boolean; jobs: PendingRow[] }>("/api/v1/superadmin/voice-jobs/pending");
    const jobs = data.jobs ?? [];
    setPending(jobs);
    setSelectedId((cur) => (cur != null && !jobs.some((x) => x.id === cur) ? null : cur));
  }, []);

  useEffect(() => {
    void loadPending().catch(() => setPending([]));
  }, [loadPending]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ ok: boolean; job: JobDetail }>(
          `/api/v1/superadmin/voice-jobs/${encodeURIComponent(selectedId)}`,
        );
        if (!cancelled) setDetail(data.job);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          toast({
            status: "error",
            title: e instanceof ApiError ? e.message : "Could not load job.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, toast]);

  function toggleReview(id: string) {
    setSelectedId((cur) => (cur === id ? null : id));
  }

  function openReject(jobId: string) {
    setRejectTargetId(jobId);
    setRejectFeedback("");
    rejectDlg.onOpen();
  }

  async function publish(id: string) {
    setBusy(`publish-${id}`);
    try {
      await apiFetch(`/api/v1/superadmin/voice-jobs/${encodeURIComponent(id)}/publish-ussd`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast({
        status: "success",
        title: "Released to USSD (demo)",
        description:
          "Farmers can dial the cooperative USSD short code—for example *850#—choose a language, and hear bulletins.",
      });
      await loadPending();
      setSelectedId(null);
      setDetail(null);
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Request failed." });
    } finally {
      setBusy(null);
    }
  }

  async function confirmReject() {
    if (!rejectTargetId) return;
    const fb = rejectFeedback.trim();
    if (fb.length < MIN_FEEDBACK_CHARS) {
      toast({
        status: "warning",
        title: `Feedback must be at least ${MIN_FEEDBACK_CHARS} characters`,
        description: "Explain the recording problem clearly for Voice Recorder Officers.",
      });
      return;
    }
    setBusy(`reject-${rejectTargetId}`);
    try {
      await apiFetch(`/api/v1/superadmin/voice-jobs/${encodeURIComponent(rejectTargetId)}/reject-ussd`, {
        method: "POST",
        body: JSON.stringify({ feedback: fb }),
      });
      toast({
        status: "info",
        title: "Returned to Voice Recorder Officers",
        description: "They will see your message on the job and can replace audio before re-submitting.",
      });
      rejectDlg.onClose();
      setRejectTargetId(null);
      setRejectFeedback("");
      await loadPending();
      setSelectedId(null);
      setDetail(null);
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Reject failed." });
    } finally {
      setBusy(null);
    }
  }

  const rejectBusy = rejectTargetId && busy === `reject-${rejectTargetId}`;

  return (
    <Stack spacing={8}>
      <Stack spacing={1}>
        <Heading size="md" color="cyan.900">
          USSD voice release (*850#)
        </Heading>
        <Text fontSize="sm" color="gray.700" maxW="3xl">
          After Voice Recorder Officers send a pack here, listen to masters against each script. Publish if everything meets
          quality and content checks. If something is wrong, reject and describe what to fix—that note appears beside the audio
          for the officers until they revise and queue again.
        </Text>
      </Stack>

      <Alert status="info" borderRadius="md" fontSize="sm">
        <AlertIcon />
        Publication is gated here; rejecting requires written feedback so the recording team knows what failed review.
      </Alert>

      {pending === null ? (
        <Text fontSize="sm">Loading queue…</Text>
      ) : pending.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No advisory packs awaiting platform release right now.
        </Text>
      ) : (
        <Stack spacing={4}>
          {pending.map((j) => (
            <Box key={j.id} borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" overflow="hidden">
              <Box p={4}>
                <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
                  <Stack spacing={1}>
                    <Text fontWeight="bold" fontSize="sm" color="gray.900">
                      {j.season ?? j.advisory_id}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      Forwarded {new Date(j.forwarded_at).toLocaleString()}
                      {j.submitted_for_platform_review_at
                        ? ` · Queued ${new Date(j.submitted_for_platform_review_at).toLocaleString()}`
                        : ""}
                    </Text>
                  </Stack>
                  <HStack spacing={2} flexWrap="wrap">
                    <Button
                      size="sm"
                      variant={selectedId === j.id ? "solid" : "outline"}
                      colorScheme="cyan"
                      onClick={() => toggleReview(j.id)}
                    >
                      {selectedId === j.id ? "Hide review" : "Review audio"}
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => void publish(j.id)}
                      isDisabled={busy !== null}
                      isLoading={busy === `publish-${j.id}`}
                    >
                      Publish to USSD (*850#)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="orange"
                      onClick={() => openReject(j.id)}
                      isDisabled={busy !== null}
                    >
                      Reject with feedback
                    </Button>
                  </HStack>
                </HStack>
              </Box>
              {selectedId === j.id && detail?.id === j.id ? (
                <>
                  <Divider />
                  <Box p={4} bg="gray.50">
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      {LANGS.map((lng) => {
                        const txt = detail.texts?.[lng] ?? "";
                        const tr = detail.tracks[lng] ?? { status: "—" };
                        return (
                          <Stack key={lng} spacing={3} bg="white" borderRadius="md" p={4} borderWidth="1px" borderColor="gray.100">
                            <Heading size="xs" color="cyan.900">
                              {lng === "Oromo" ? "Afaan Oromoo" : lng}
                            </Heading>
                            <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap" maxH={120} overflowY="auto">
                              {txt || "(No advisory text captured.)"}
                            </Text>
                            <Text fontSize="xs">
                              Officer status: <strong>{tr.status}</strong>
                            </Text>
                            {tr.audio_src ? (
                              <audio controls src={tr.audio_src} style={{ width: "100%", maxHeight: 40 }} />
                            ) : (
                              <Text fontSize="xs" color="orange.700">
                                No audio loaded.
                              </Text>
                            )}
                          </Stack>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                </>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}

      <Modal isOpen={rejectDlg.isOpen} onClose={rejectDlg.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reject advisory pack</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.700">
                Voice Recorder Officers will see this alongside the forwarded script and masters. Specify what failed (script
                fidelity, pacing, pronunciation, clipping, noise, wrong language variant, etc.).
              </Text>
              <FormControl isRequired>
                <FormLabel fontSize="sm">What needs correcting</FormLabel>
                <Textarea
                  rows={6}
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  placeholder="Example: English track cuts off halfway through rain dates; redo with full script. Amharic intro is quieter than fertilizer line—normalize loudness."
                />
                <FormHelperText>{MIN_FEEDBACK_CHARS}+ characters minimum</FormHelperText>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={rejectDlg.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={() => void confirmReject()}
              isDisabled={busy !== null}
              isLoading={Boolean(rejectBusy)}
            >
              Send back to Voice Recorder Officers
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
