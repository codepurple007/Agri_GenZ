import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Progress,
  Stack,
  Table,
  TableContainer,
  Text,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";

type LogRow = {
  id: string;
  farmer_name: string;
  phone_number: string;
  status: string;
  error_message?: string | null;
  sent_at?: string | null;
};

type BroadcastState = {
  id: string;
  external_id?: string;
  status: string;
  target_count?: number;
  estimated_cost_etb?: number;
  progress?: number;
  log_summary?: { sent: number; queued: number; failed: number };
};

export function KebeleBroadcastStatusPage() {
  const { id = "" } = useParams<{ id: string }>();
  const toast = useToast();
  const [bc, setBc] = useState<BroadcastState | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ broadcast: BroadcastState; log: LogRow[] }>(
        `/api/v1/agri-sms/broadcasts/${encodeURIComponent(id)}/status`,
      );
      setBc(data.broadcast);
      setLog(data.log ?? []);
    } catch {
      toast({ status: "error", title: "Not found." });
      setBc(null);
      setLog([]);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retryFailed() {
    try {
      const data = await apiFetch<{ log: LogRow[] }>(`/api/v1/agri-sms/broadcasts/${encodeURIComponent(id)}/retry`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setLog(data.log);
      toast({ status: "success", title: "OK." });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Retry failed.";
      toast({ status: "error", title: msg });
    }
  }

  const pct = bc?.progress != null ? Math.round(Number(bc.progress) * 100) : 0;
  const badgeColor =
    bc?.status === "COMPLETED"
      ? "green"
      : bc?.status === "FAILED"
        ? "red"
        : bc?.status === "SENDING"
          ? "blue"
          : "purple";

  return (
    <Stack spacing={8}>
      <Stack spacing={1}>
        <Button as={RouterLink} to="/kebele/broadcast" variant="link" alignSelf="flex-start" colorScheme="green">
          ← Back
        </Button>
        <Heading size="lg" color="brand.900">
          Status
        </Heading>
      </Stack>

      {bc ? (
        <>
          <Stack spacing={3} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
            <Text fontFamily="mono" fontSize="sm">
              ID: {bc.external_id ?? bc.id.slice(0, 8)}
            </Text>
            <HStack align="center" spacing={4} flexWrap="wrap">
              <Badge colorScheme={badgeColor}>{bc.status ?? "UNKNOWN"}</Badge>
              <Text fontSize="sm">Targets: {bc.target_count ?? log.length}</Text>
              <Text fontSize="sm">Est. cost: {bc.estimated_cost_etb ?? "–"} ETB</Text>
            </HStack>
            <Progress value={pct} colorScheme="green" borderRadius="md" />
            <Text fontSize="sm" color="gray.700">
              {pct}%
              {bc.log_summary ? ` · ${bc.log_summary.sent}/${bc.log_summary.queued}/${bc.log_summary.failed}` : ""}
            </Text>
            <Box>
              <Button size="sm" variant="outline" colorScheme="green" onClick={() => void retryFailed()}>
                Retry failed
              </Button>
            </Box>
          </Stack>

          <Stack spacing={2}>
            <Text fontWeight="700">Log</Text>
            <TableContainer bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.100">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Farmer</Th>
                    <Th>Phone</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {log.map((row) => (
                    <Tr key={row.id}>
                      <Td>{row.farmer_name}</Td>
                      <Td fontFamily="mono" fontSize="xs">
                        {row.phone_number}
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            row.status === "SENT" ? "green" : row.status === "FAILED" ? "red" : "orange"
                          }
                        >
                          {row.status}
                        </Badge>
                        {row.error_message ? (
                          <Text fontSize="xs" color="red.600" mt={1}>
                            {row.error_message}
                          </Text>
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Stack>
        </>
      ) : !loading ? (
        <Text color="gray.600">No broadcast data.</Text>
      ) : (
        <Text color="gray.600">Loading…</Text>
      )}
    </Stack>
  );
}
