import {
  Badge,
  Heading,
  HStack,
  Link,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { apiFetch } from "@/api/client";

type VoiceJobRow = {
  id: string;
  advisory_id: string;
  forwarded_at: string;
  season?: string;
  ussd_publish_status?: "none" | "pending_superadmin" | "live";
  review_rejection_note?: string | null;
  tracks?: Record<
    string,
    { status: string; has_audio?: boolean; approved_at?: string | null; sent_at?: string | null }
  >;
};

export function VoiceRecorderJobsPage() {
  const [jobs, setJobs] = useState<VoiceJobRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await apiFetch<{ ok: boolean; jobs: VoiceJobRow[] }>("/api/v1/voice-recorder/jobs");
        if (!cancel) setJobs(data.jobs ?? []);
      } catch (e) {
        if (!cancel) setErr(e instanceof ApiError ? e.message : "Failed to load.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  function summaryTracks(j: VoiceJobRow): string {
    const t = j.tracks;
    if (!t) return "—";
    return ["Amharic", "Oromo", "English"].map((lng) => t[lng]?.status ?? "?").join(" · ");
  }

  function pipelineChip(j: VoiceJobRow): string {
    switch (j.ussd_publish_status) {
      case "pending_superadmin":
        return "Queued — Super Admin";
      case "live":
        return "Published — USSD (*850#)";
      default:
        return "Staff editing";
    }
  }

  if (err) {
    return (
      <Text color="red.600" role="alert">
        {err}
      </Text>
    );
  }

  if (jobs === null) {
    return (
      <Stack align="center" py={16}>
        <Spinner color="purple.500" />
        <Text fontSize="sm" color="gray.600">
          Loading voice jobs…
        </Text>
      </Stack>
    );
  }

  return (
    <Stack spacing={6}>
      <Heading size="md" color="purple.900">
        Pending advisory recordings
      </Heading>
      <Text fontSize="sm" color="gray.700">
        Open a job to record Amharic, Afaan Oromoo, and English audio; after you approve all three, submit for Super Admin —
        only they release bulletins for farmers dialing <em>*850#</em> or the cooperative’s district code (USSD landing
        guide).
      </Text>
      {jobs.length === 0 ? (
        <Text fontSize="sm">No jobs yet. Ask a Kebele worker to forward the current advisory.</Text>
      ) : (
        <TableContainer bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Season</Th>
                <Th>Forwarded</Th>
                <Th>Stages</Th>
                <Th>Statuses</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((j) => (
                <Tr key={j.id}>
                  <Td>
                    <HStack spacing={2} flexWrap="wrap">
                      <span>{j.season ?? j.advisory_id}</span>
                      {j.review_rejection_note ? (
                        <Badge colorScheme="red" fontSize="0.65rem">
                          SA feedback
                        </Badge>
                      ) : null}
                    </HStack>
                  </Td>
                  <Td>{new Date(j.forwarded_at).toLocaleString()}</Td>
                  <Td fontSize="xs" color="purple.700" fontWeight="medium">
                    {pipelineChip(j)}
                  </Td>
                  <Td fontSize="xs">{summaryTracks(j)}</Td>
                  <Td textAlign="right">
                    <Link as={RouterLink} to={`/voice-recorder/jobs/${j.id}`} color="purple.600" fontWeight="semibold">
                      Open
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
