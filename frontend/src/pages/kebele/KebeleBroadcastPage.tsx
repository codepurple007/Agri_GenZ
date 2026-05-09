import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { KEBELE_VILLAGES } from "@/agriSms/constants";

type SmsFarmerRow = {
  id: string;
  kebele: string;
  is_active: boolean;
  consent_given: boolean;
};

type PreviewLang = "Amharic" | "Oromo" | "English";

type PreviewRes = {
  ok: boolean;
  messages: Record<string, string>;
  segments: Record<string, number>;
};

export function KebeleBroadcastPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<SmsFarmerRow[]>([]);
  const [allFarmers, setAllFarmers] = useState(true);
  const [chosenVillages, setChosenVillages] = useState<string[]>(() => [...KEBELE_VILLAGES]);

  const [incSoil, setIncSoil] = useState(true);
  const [incWeather, setIncWeather] = useState(true);
  const [incCrops, setIncCrops] = useState(true);
  const [incPrices, setIncPrices] = useState(true);

  const [previewLang, setPreviewLang] = useState<PreviewLang>("Amharic");
  const [previewMsg, setPreviewMsg] = useState("");
  const [previewSeg, setPreviewSeg] = useState<number | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const previewKebele = useMemo(
    () => (allFarmers ? KEBELE_VILLAGES[0] : chosenVillages[0] ?? KEBELE_VILLAGES[0]),
    [allFarmers, chosenVillages],
  );

  const eligible = useMemo(() => {
    const base = farmers.filter((f) => f.is_active && f.consent_given);
    if (allFarmers) return base;
    if (!chosenVillages.length) return [];
    return base.filter((f) => chosenVillages.includes(f.kebele));
  }, [farmers, allFarmers, chosenVillages]);

  const eligibleCount = eligible.length;

  const estCostPreview = previewSeg != null ? eligibleCount * previewSeg : null;

  const loadFarmers = useCallback(async () => {
    try {
      const data = await apiFetch<{ farmers: SmsFarmerRow[] }>("/api/v1/agri-sms/farmers");
      setFarmers(data.farmers);
    } catch {
      toast({ status: "error", title: "Failed." });
    }
  }, [toast]);

  useEffect(() => {
    void loadFarmers();
  }, [loadFarmers]);

  function toggleVillage(v: string) {
    setChosenVillages((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  async function runPreview() {
    setPreviewBusy(true);
    setPreviewSeg(null);
    setPreviewMsg("");
    try {
      const data = await apiFetch<PreviewRes>("/api/v1/agri-sms/broadcasts/preview", {
        method: "POST",
        body: JSON.stringify({
          kebele: previewKebele,
          include: {
            soil: incSoil,
            weather: incWeather,
            crops: incCrops,
            prices: incPrices,
          },
        }),
      });
      const key = previewLang === "English" ? "English" : previewLang === "Oromo" ? "Oromo" : "Amharic";
      setPreviewMsg(data.messages[key] ?? "");
      setPreviewSeg(data.segments[key] ?? null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Preview failed.";
      toast({ status: "error", title: msg });
    } finally {
      setPreviewBusy(false);
    }
  }

  async function send() {
    if (!allFarmers && !chosenVillages.length) {
      toast({ status: "warning", title: "Pick a village." });
      return;
    }
    setSendBusy(true);
    try {
      const filters = allFarmers ? { all_farmers: true } : { kebeles: chosenVillages };
      const data = await apiFetch<{ ok: boolean; broadcast: { id: string } }>("/api/v1/agri-sms/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          include: {
            soil: incSoil,
            weather: incWeather,
            crops: incCrops,
            prices: incPrices,
          },
          target_filters: filters,
        }),
      });
      toast({ status: "success", title: "Queued." });
      navigate(`/kebele/broadcast/status/${encodeURIComponent(data.broadcast.id)}`, { replace: false });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Send failed.";
      toast({ status: "error", title: msg });
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.900">
        Broadcast
      </Heading>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700">Include</Text>
        <Stack spacing={2}>
          <Checkbox isChecked={incSoil} onChange={(e) => setIncSoil(e.target.checked)} colorScheme="green">
            Soil information
          </Checkbox>
          <Checkbox isChecked={incWeather} onChange={(e) => setIncWeather(e.target.checked)} colorScheme="green">
            Weather forecast
          </Checkbox>
          <Checkbox isChecked={incCrops} onChange={(e) => setIncCrops(e.target.checked)} colorScheme="green">
            Crop recommendations
          </Checkbox>
          <Checkbox isChecked={incPrices} onChange={(e) => setIncPrices(e.target.checked)} colorScheme="green">
            Market prices
          </Checkbox>
        </Stack>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700">Audience</Text>
        <Checkbox isChecked={allFarmers} onChange={(e) => setAllFarmers(e.target.checked)} colorScheme="green">
          All active ({farmers.filter((f) => f.is_active && f.consent_given).length})
        </Checkbox>
        {!allFarmers ? (
          <Stack spacing={2} pl={2}>
            <HStack spacing={4} wrap="wrap">
              {KEBELE_VILLAGES.map((v) => (
                <Checkbox
                  key={v}
                  isChecked={chosenVillages.includes(v)}
                  onChange={() => toggleVillage(v)}
                  colorScheme="green"
                >
                  {v}
                </Checkbox>
              ))}
            </HStack>
          </Stack>
        ) : null}
        <HStack spacing={6} pt={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="600">
            Recipients: {eligibleCount}
          </Text>
          {previewSeg != null ? (
            <Text fontSize="sm" color="gray.700">
              ~{(estCostPreview ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB
            </Text>
          ) : null}
        </HStack>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700">Preview</Text>
        <FormControl maxW="xs">
          <FormLabel fontSize="sm">Language</FormLabel>
          <Select value={previewLang} onChange={(e) => setPreviewLang(e.target.value as PreviewLang)}>
            <option value="Amharic">አማርኛ (Amharic)</option>
            <option value="Oromo">Afaan Oromoo</option>
            <option value="English">English</option>
          </Select>
        </FormControl>
        <Text fontSize="xs" color="gray.500">
          {previewKebele}
        </Text>
        <Button colorScheme="green" variant="outline" maxW="xs" onClick={() => void runPreview()} isLoading={previewBusy}>
          Preview
        </Button>
        {previewSeg != null ? (
          <Text fontSize="sm">
            Segments:{" "}
            <Box as="span" fontWeight="700">
              {previewSeg}
            </Box>
          </Text>
        ) : null}
        <Textarea value={previewMsg} readOnly placeholder="" minH="200px" fontSize="sm" />
      </Stack>

      <Divider />

      <HStack spacing={3} flexWrap="wrap">
        <Button colorScheme="green" size="lg" onClick={() => void send()} isLoading={sendBusy} isDisabled={!eligibleCount}>
          Send
        </Button>
        <Button variant="ghost" onClick={() => void loadFarmers()}>
          Refresh
        </Button>
      </HStack>

      {!eligibleCount ? (
        <Text fontSize="sm" color="red.600">
          No recipients.
        </Text>
      ) : null}
    </Stack>
  );
}
