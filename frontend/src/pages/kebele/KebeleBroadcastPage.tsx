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
import { useAuth } from "@/hooks/useAuth";
import { getStoredLocale, type Locale } from "@/i18n/landing";
import { formatJurisdictionLine, resolveSmsWorkerJurisdiction } from "@/pages/kebele/kebeleScope";

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

function deskLocale(): Locale {
  const s = getStoredLocale();
  return s === "en" || s === "am" || s === "om" ? s : "en";
}

export function KebeleBroadcastPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uiLocale = deskLocale();
  const { regionId: scopedRegionId, districtNum: scopedDistrictNum } = resolveSmsWorkerJurisdiction(user);

  const [farmers, setFarmers] = useState<SmsFarmerRow[]>([]);

  const [incSoil, setIncSoil] = useState(true);
  const [incWeather, setIncWeather] = useState(true);
  const [incCrops, setIncCrops] = useState(true);
  const [incPrices, setIncPrices] = useState(true);

  const [previewLang, setPreviewLang] = useState<PreviewLang>("Amharic");
  const [previewMsg, setPreviewMsg] = useState("");
  const [previewSeg, setPreviewSeg] = useState<number | null>(null);
  const [cachedPreviewMsgs, setCachedPreviewMsgs] = useState<Record<string, string> | null>(null);
  const [cachedPreviewSegs, setCachedPreviewSegs] = useState<Record<string, number> | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const jurisdictionLine =
    scopedRegionId != null && scopedDistrictNum != null
      ? formatJurisdictionLine(scopedRegionId, scopedDistrictNum, uiLocale)
      : uiLocale === "am"
        ? "የእርስዎ ወረዳ"
        : uiLocale === "om"
          ? "Diristirikii keessan"
          : "Your district";

  const eligible = useMemo(
    () => farmers.filter((f) => f.is_active && f.consent_given),
    [farmers],
  );
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

  useEffect(() => {
    if (!cachedPreviewMsgs || !cachedPreviewSegs) return;
    const key = previewLang === "English" ? "English" : previewLang === "Oromo" ? "Oromo" : "Amharic";
    setPreviewMsg(cachedPreviewMsgs[key] ?? "");
    setPreviewSeg(cachedPreviewSegs[key] ?? null);
  }, [previewLang, cachedPreviewMsgs, cachedPreviewSegs]);

  async function runPreview() {
    setPreviewBusy(true);
    setPreviewSeg(null);
    setPreviewMsg("");
    setCachedPreviewMsgs(null);
    setCachedPreviewSegs(null);
    try {
      const data = await apiFetch<PreviewRes>("/api/v1/agri-sms/broadcasts/preview", {
        method: "POST",
        body: JSON.stringify({
          include: {
            soil: incSoil,
            weather: incWeather,
            crops: incCrops,
            prices: incPrices,
          },
        }),
      });
      setCachedPreviewMsgs(data.messages);
      setCachedPreviewSegs(data.segments);
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
    setSendBusy(true);
    try {
      const data = await apiFetch<{ ok: boolean; broadcast: { id: string } }>("/api/v1/agri-sms/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          include: {
            soil: incSoil,
            weather: incWeather,
            crops: incCrops,
            prices: incPrices,
          },
          target_filters: { all_farmers: true },
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
      <Text fontSize="sm" color="gray.700">
        Messages go to consenting farmers in <strong>{jurisdictionLine}</strong> only — same cohort as your farmer list.
      </Text>

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
        <Text fontSize="sm" color="gray.700">
          All eligible farmers currently listed for your jurisdiction ({eligibleCount}).
        </Text>
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
          {jurisdictionLine}
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
