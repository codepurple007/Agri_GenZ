import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";

type SmsLang = "Amharic" | "Oromo" | "English";

type LangBundle = Record<SmsLang, string>;

const SMS_LANGS: SmsLang[] = ["Amharic", "Oromo", "English"];

function emptyLangBundle(): LangBundle {
  return { Amharic: "", Oromo: "", English: "" };
}

function parseLangBundle(raw: unknown): LangBundle {
  const b = emptyLangBundle();
  if (!raw || typeof raw !== "object") return b;
  const o = raw as Record<string, unknown>;
  for (const k of SMS_LANGS) {
    const v = o[k];
    if (typeof v === "string") b[k] = v;
  }
  return b;
}

function fillBundleFromLegacy(b: LangBundle, legacy: string): LangBundle {
  const leg = legacy.trim();
  if (!leg) return b;
  const out = { ...b };
  for (const k of SMS_LANGS) {
    if (!out[k].trim()) out[k] = leg;
  }
  return out;
}

type AdvisoryDoc = {
  season?: string;
  soil_condition?: string;
  fertilizer_recommendation?: string;
  fertilizer_by_lang?: Partial<LangBundle>;
  soil_ph?: string;
  rain_start?: string;
  rain_end?: string;
  forecast_summary?: string;
  forecast_by_lang?: Partial<LangBundle>;
  weather_alert?: string;
  recommended_crops?: string[];
  not_recommended_crops?: string[];
  planting_advice?: string;
  wheat_price_etb?: number;
  teff_price_etb?: number;
  maize_price_etb?: number;
  barley_price_etb?: number;
  market_trend?: string;
};

function toDateInput(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function splitList(s: string): string[] {
  return s
    .split(/[,;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Belg + Meher labels for Ethiopian cropping seasons — years ±1 around current calendar year */
function seasonChoiceList(): string[] {
  const y = new Date().getFullYear();
  const yrs = [y - 1, y, y + 1];
  const out: string[] = [];
  for (const year of yrs) {
    out.push(`Belg ${year}`);
    out.push(`Meher ${year}`);
  }
  return out;
}

type AiDraftRes = {
  ok: boolean;
  draft?: {
    season?: string;
    fertilizer_recommendation?: string;
    fertilizer_by_lang?: Partial<LangBundle>;
    forecast_summary?: string;
    forecast_by_lang?: Partial<LangBundle>;
    rain_start?: string;
    rain_end?: string;
    weather_alert?: string;
  };
  message?: string;
};

function voiceTrackLabel(status: string): string {
  switch (status) {
    case "pending_recording":
      return "Pending recording";
    case "recorded":
      return "Recorded";
    case "reroll_requested":
      return "Re-record requested";
    case "approved":
      return "Approved";
    case "sent_to_ussd":
      return "Live on USSD (*850#)";
    default:
      return status || "—";
  }
}

type VoiceStatusRes = {
  forwarded: boolean;
  job: {
    id: string;
    tracks: Partial<Record<SmsLang, { status: string; has_audio?: boolean }>>;
    ussd_publish_status?: string;
    submitted_for_platform_review_at?: string | null;
  } | null;
};

export function KebeleAdvisoryPage() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<VoiceStatusRes | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [season, setSeason] = useState("Meher 2026");
  const [soilCondition, setSoilCondition] = useState("Normal");
  const [fertilizerByLang, setFertilizerByLang] = useState<LangBundle>(() => emptyLangBundle());
  const [soilPh, setSoilPh] = useState("Neutral");
  const [rainStart, setRainStart] = useState("");
  const [rainEnd, setRainEnd] = useState("");
  const [forecastByLang, setForecastByLang] = useState<LangBundle>(() => emptyLangBundle());
  const [weatherAlert, setWeatherAlert] = useState("None");
  const [recText, setRecText] = useState("");
  const [avoidText, setAvoidText] = useState("");
  const [planting, setPlanting] = useState("");
  const [wheatP, setWheatP] = useState("");
  const [teffP, setTeffP] = useState("");
  const [maizeP, setMaizeP] = useState("");
  const [barleyP, setBarleyP] = useState("");
  const [trend, setTrend] = useState("Stable");

  const seasonOptions = useMemo(() => {
    const base = seasonChoiceList();
    if (season && !base.includes(season)) return [season, ...base];
    return base;
  }, [season]);

  const refreshVoiceStatus = useCallback(async () => {
    try {
      const data = await apiFetch<{ forwarded: boolean; job: VoiceStatusRes["job"] }>(
        "/api/v1/agri-sms/advisory-voice/status",
      );
      setVoiceInfo({
        forwarded: Boolean(data.forwarded),
        job: data.job ?? null,
      });
    } catch {
      /* optional — advisory still editable */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ advisory: AdvisoryDoc }>("/api/v1/agri-sms/advisories/current");
      const a = data.advisory;
      setSeason(String(a.season ?? "Meher 2026"));
      setSoilCondition(String(a.soil_condition ?? "Normal"));
      const legF = String(a.fertilizer_recommendation ?? "");
      const legFc = String(a.forecast_summary ?? "");
      setFertilizerByLang(fillBundleFromLegacy(parseLangBundle(a.fertilizer_by_lang), legF));
      setSoilPh(String(a.soil_ph ?? "Neutral"));
      setRainStart(toDateInput(a.rain_start));
      setRainEnd(toDateInput(a.rain_end));
      setForecastByLang(fillBundleFromLegacy(parseLangBundle(a.forecast_by_lang), legFc));
      setWeatherAlert(String(a.weather_alert ?? "None"));
      setRecText((a.recommended_crops ?? []).join(", "));
      setAvoidText((a.not_recommended_crops ?? []).join(", "));
      setPlanting(String(a.planting_advice ?? ""));
      setWheatP(String(a.wheat_price_etb ?? ""));
      setTeffP(String(a.teff_price_etb ?? ""));
      setMaizeP(String(a.maize_price_etb ?? ""));
      setBarleyP(String(a.barley_price_etb ?? ""));
      setTrend(String(a.market_trend ?? "Stable"));
      await refreshVoiceStatus();
    } catch {
      toast({ status: "error", title: "Failed." });
    }
  }, [toast, refreshVoiceStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAiDraft() {
    setAiBusy(true);
    try {
      const data = await apiFetch<AiDraftRes>("/api/v1/agri-sms/advisories/ai-draft", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!data.ok || !data.draft) {
        toast({ status: "warning", title: data.message ?? "AI unavailable." });
        return;
      }
      const d = data.draft;
      if (d.season != null) setSeason(String(d.season));
      if (d.fertilizer_by_lang != null) {
        setFertilizerByLang((prev) => {
          const merged = { ...prev, ...parseLangBundle(d.fertilizer_by_lang) };
          return fillBundleFromLegacy(merged, String(d.fertilizer_recommendation ?? ""));
        });
      } else if (d.fertilizer_recommendation != null) {
        setFertilizerByLang(fillBundleFromLegacy(emptyLangBundle(), String(d.fertilizer_recommendation)));
      }
      if (d.forecast_by_lang != null) {
        setForecastByLang((prev) => {
          const merged = { ...prev, ...parseLangBundle(d.forecast_by_lang) };
          return fillBundleFromLegacy(merged, String(d.forecast_summary ?? ""));
        });
      } else if (d.forecast_summary != null) {
        setForecastByLang(fillBundleFromLegacy(emptyLangBundle(), String(d.forecast_summary)));
      }
      if (d.rain_start != null && d.rain_start.length >= 10) setRainStart(toDateInput(d.rain_start));
      if (d.rain_end != null && d.rain_end.length >= 10) setRainEnd(toDateInput(d.rain_end));
      if (d.weather_alert != null) setWeatherAlert(String(d.weather_alert));
      toast({ status: "success", title: "Draft ready." });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed.";
      toast({ status: "error", title: msg });
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/api/v1/agri-sms/advisories", {
        method: "POST",
        body: JSON.stringify({
          season,
          soil_condition: soilCondition,
          fertilizer_by_lang: fertilizerByLang,
          fertilizer_recommendation:
            fertilizerByLang.English.trim() ||
            fertilizerByLang.Amharic.trim() ||
            fertilizerByLang.Oromo.trim(),
          soil_ph: soilPh,
          rain_start: rainStart || null,
          rain_end: rainEnd || null,
          forecast_by_lang: forecastByLang,
          forecast_summary:
            forecastByLang.English.trim() ||
            forecastByLang.Amharic.trim() ||
            forecastByLang.Oromo.trim(),
          weather_alert: weatherAlert,
          recommended_crops: splitList(recText),
          not_recommended_crops: splitList(avoidText),
          planting_advice: planting,
          wheat_price_etb: wheatP === "" ? undefined : Number(wheatP),
          teff_price_etb: teffP === "" ? undefined : Number(teffP),
          maize_price_etb: maizeP === "" ? undefined : Number(maizeP),
          barley_price_etb: barleyP === "" ? undefined : Number(barleyP),
          market_trend: trend,
        }),
      });
      toast({ status: "success", title: "Saved." });
      await refreshVoiceStatus();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed.";
      toast({ status: "error", title: msg });
    } finally {
      setBusy(false);
    }
  }

  async function forwardToVoiceStaff() {
    setVoiceBusy(true);
    try {
      await apiFetch("/api/v1/agri-sms/advisory-voice/forward", { method: "POST", body: JSON.stringify({}) });
      toast({
        status: "success",
        title: "Forwarded to Voice Recorder Officers.",
        description: "Amharic, Afaan Oromoo, and English tracks queued.",
      });
      await refreshVoiceStatus();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Forward failed." });
    } finally {
      setVoiceBusy(false);
    }
  }

  async function requestVoiceRerecord(lng: SmsLang) {
    setVoiceBusy(true);
    try {
      await apiFetch("/api/v1/agri-sms/advisory-voice/request-rerecord", {
        method: "POST",
        body: JSON.stringify({ language: lng }),
      });
      toast({ status: "info", title: `${lng}: re-record requested.` });
      await refreshVoiceStatus();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Could not flag re-record." });
    } finally {
      setVoiceBusy(false);
    }
  }

  const voiceJob = voiceInfo?.job;
  const voicePendingSa = Boolean(voiceInfo?.forwarded && voiceJob?.ussd_publish_status === "pending_superadmin");
  const voiceLiveOnUssd = Boolean(
    voiceInfo?.forwarded &&
      voiceJob &&
      (voiceJob.ussd_publish_status === "live" ||
        SMS_LANGS.every((lng) => voiceJob.tracks?.[lng]?.status === "sent_to_ussd")),
  );

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.900">
        Advisory
      </Heading>

      <Stack
        spacing={4}
        bg="white"
        p={6}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="purple.100"
        shadow="sm"
      >
        <Heading size="sm" color="purple.900">
          USSD / IVR voice (*850#)
        </Heading>
        <Text fontSize="sm" color="gray.700">
          After the multilingual SMS text below is finalized, forward it so Voice Recorder Officers can attach Amharic,
          Afaan Oromoo, and English readings for low-bandwidth IVR playback. Super Administrators approve the final masters
          before farmers hear them via USSD (e.g. <em>*850#</em> — the same dial-flow as the public landing).
        </Text>
        {voicePendingSa ? (
          <Alert status="warning" borderRadius="md" fontSize="sm">
            <AlertIcon />
            Voice tracks are queued with the Super Administrator for USSD release. Bulletin audio is not yet on farmers’ dial-in
            menu.
          </Alert>
        ) : null}
        {voiceLiveOnUssd ? (
          <Alert status="success" borderRadius="md" fontSize="sm">
            <AlertIcon />
            Pack has been released to USSD-style menus (demo). Farmers can dial the cooperative short code, choose language, and
            hear bulletins.
          </Alert>
        ) : null}
        {!voiceInfo?.forwarded ? (
          <Button
            colorScheme="purple"
            size="sm"
            maxW="md"
            isLoading={voiceBusy}
            onClick={() => void forwardToVoiceStaff()}
          >
            Forward advisory text to Voice Recorder Officers
          </Button>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {SMS_LANGS.map((lng) => {
              const st = voiceInfo.job?.tracks?.[lng]?.status ?? "pending_recording";
              const colorScheme =
                st === "sent_to_ussd"
                  ? "cyan"
                  : st === "approved" && voiceJob?.ussd_publish_status === "pending_superadmin"
                    ? "purple"
                    : st === "approved"
                      ? "green"
                      : st === "reroll_requested"
                        ? "orange"
                        : "gray";
              return (
                <Stack key={lng} spacing={2} bg="purple.50" p={4} borderRadius="md">
                  <Text fontWeight="bold" fontSize="sm">
                    {lng === "Oromo" ? "Afaan Oromoo" : lng}
                  </Text>
                  <Badge colorScheme={colorScheme}>{voiceTrackLabel(st)}</Badge>
                  <Button
                    size="xs"
                    variant="outline"
                    isDisabled={
                      voiceBusy ||
                      voiceJob?.ussd_publish_status === "pending_superadmin" ||
                      st === "sent_to_ussd" ||
                      st === "reroll_requested" ||
                      !(st === "recorded" || st === "approved")
                    }
                    onClick={() => void requestVoiceRerecord(lng)}
                  >
                    Request re-record
                  </Button>
                </Stack>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>

      <HStack spacing={3} flexWrap="wrap" bg="brand.50" p={4} borderRadius="lg" borderWidth="1px" borderColor="green.100">
        <Text fontSize="sm" color="gray.700" maxW="md">
          Gemini uses aggregated signup data from <strong>your logged-in district scope</strong> (same cohort as Farmers list).
        </Text>
        <Button colorScheme="green" size="sm" alignSelf="flex-end" isLoading={aiBusy} onClick={() => void runAiDraft()}>
          Draft (Gemini)
        </Button>
      </HStack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="green.200">
        <Text fontWeight="700" fontSize="md" color="green.800">
          Season · fertilizer · weather
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl>
              <FormLabel fontSize="sm">Season</FormLabel>
              <Select value={seasonOptions.includes(season) ? season : seasonOptions[0]} onChange={(e) => setSeason(e.target.value)}>
                {seasonOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </FormControl>
          </GridItem>
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl>
              <FormLabel fontSize="sm">Fertilizer & forecast (by SMS language)</FormLabel>
              <Text fontSize="xs" color="gray.600" mb={2}>
                Draft (Gemini) writes አማርኛ, Afaan Oromoo, and English. Keep each version short and clear for farmers.
              </Text>
              <Tabs variant="enclosed" colorScheme="green" size="sm">
                <TabList flexWrap="wrap">
                  <Tab>አማርኛ</Tab>
                  <Tab>Afaan Oromoo</Tab>
                  <Tab>English</Tab>
                </TabList>
                <TabPanels>
                  {SMS_LANGS.map((lng) => (
                    <TabPanel key={lng} px={{ base: 0, md: 1 }} pt={3}>
                      <FormLabel fontSize="xs">Fertilizer</FormLabel>
                      <Textarea
                        rows={3}
                        mb={3}
                        fontSize="sm"
                        value={fertilizerByLang[lng]}
                        onChange={(e) => setFertilizerByLang((p) => ({ ...p, [lng]: e.target.value }))}
                      />
                      <FormLabel fontSize="xs">Rain / season outlook</FormLabel>
                      <Textarea
                        rows={3}
                        fontSize="sm"
                        value={forecastByLang[lng]}
                        onChange={(e) => setForecastByLang((p) => ({ ...p, [lng]: e.target.value }))}
                      />
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </FormControl>
          </GridItem>
          <FormControl>
            <FormLabel fontSize="sm">Rain start</FormLabel>
            <Input type="date" value={rainStart} onChange={(e) => setRainStart(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Rain end</FormLabel>
            <Input type="date" value={rainEnd} onChange={(e) => setRainEnd(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Weather alert</FormLabel>
            <Select value={weatherAlert} onChange={(e) => setWeatherAlert(e.target.value)}>
              <option value="None">None</option>
              <option value="Flood">Flood</option>
              <option value="Drought">Drought</option>
              <option value="Hail">Hail</option>
            </Select>
          </FormControl>
        </Grid>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700" fontSize="md">
          Soil
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <FormControl>
            <FormLabel fontSize="sm">Condition</FormLabel>
            <Select value={soilCondition} onChange={(e) => setSoilCondition(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Dry">Dry</option>
              <option value="Saturated">Saturated</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">pH</FormLabel>
            <Select value={soilPh} onChange={(e) => setSoilPh(e.target.value)}>
              <option value="Acidic">Acidic</option>
              <option value="Neutral">Neutral</option>
              <option value="Alkaline">Alkaline</option>
            </Select>
          </FormControl>
        </Grid>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700" fontSize="md">
          Crops
        </Text>
        <FormControl>
          <FormLabel fontSize="sm">Recommended</FormLabel>
          <Input value={recText} onChange={(e) => setRecText(e.target.value)} placeholder="Wheat, Teff" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Not recommended</FormLabel>
          <Input value={avoidText} onChange={(e) => setAvoidText(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Planting advice</FormLabel>
          <Textarea value={planting} onChange={(e) => setPlanting(e.target.value)} rows={2} />
        </FormControl>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700" fontSize="md">
          Market (ETB / quintal)
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
          <FormControl>
            <FormLabel fontSize="sm">Wheat</FormLabel>
            <Input inputMode="decimal" value={wheatP} onChange={(e) => setWheatP(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Teff</FormLabel>
            <Input inputMode="decimal" value={teffP} onChange={(e) => setTeffP(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Maize</FormLabel>
            <Input inputMode="decimal" value={maizeP} onChange={(e) => setMaizeP(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Barley</FormLabel>
            <Input inputMode="decimal" value={barleyP} onChange={(e) => setBarleyP(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Trend</FormLabel>
            <Select value={trend} onChange={(e) => setTrend(e.target.value)}>
              <option value="Stable">Stable</option>
              <option value="Up">Up</option>
              <option value="Down">Down</option>
            </Select>
          </FormControl>
        </Grid>
      </Stack>

      <Button colorScheme="green" size="lg" maxW="sm" onClick={() => void save()} isLoading={busy}>
        Save advisory
      </Button>
    </Stack>
  );
}
