import {
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";

type AdvisoryDoc = {
  season?: string;
  soil_condition?: string;
  fertilizer_recommendation?: string;
  soil_ph?: string;
  rain_start?: string;
  rain_end?: string;
  forecast_summary?: string;
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

export function KebeleAdvisoryPage() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [season, setSeason] = useState("Meher 2026");
  const [soilCondition, setSoilCondition] = useState("Normal");
  const [fertilizer, setFertilizer] = useState("");
  const [soilPh, setSoilPh] = useState("Neutral");
  const [rainStart, setRainStart] = useState("");
  const [rainEnd, setRainEnd] = useState("");
  const [forecast, setForecast] = useState("");
  const [weatherAlert, setWeatherAlert] = useState("None");
  const [recText, setRecText] = useState("");
  const [avoidText, setAvoidText] = useState("");
  const [planting, setPlanting] = useState("");
  const [wheatP, setWheatP] = useState("");
  const [teffP, setTeffP] = useState("");
  const [maizeP, setMaizeP] = useState("");
  const [barleyP, setBarleyP] = useState("");
  const [trend, setTrend] = useState("Stable");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ advisory: AdvisoryDoc }>("/api/v1/agri-sms/advisories/current");
      const a = data.advisory;
      setSeason(String(a.season ?? ""));
      setSoilCondition(String(a.soil_condition ?? "Normal"));
      setFertilizer(String(a.fertilizer_recommendation ?? ""));
      setSoilPh(String(a.soil_ph ?? "Neutral"));
      setRainStart(toDateInput(a.rain_start));
      setRainEnd(toDateInput(a.rain_end));
      setForecast(String(a.forecast_summary ?? ""));
      setWeatherAlert(String(a.weather_alert ?? "None"));
      setRecText((a.recommended_crops ?? []).join(", "));
      setAvoidText((a.not_recommended_crops ?? []).join(", "));
      setPlanting(String(a.planting_advice ?? ""));
      setWheatP(String(a.wheat_price_etb ?? ""));
      setTeffP(String(a.teff_price_etb ?? ""));
      setMaizeP(String(a.maize_price_etb ?? ""));
      setBarleyP(String(a.barley_price_etb ?? ""));
      setTrend(String(a.market_trend ?? "Stable"));
    } catch {
      toast({ status: "error", title: "Failed." });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/api/v1/agri-sms/advisories", {
        method: "POST",
        body: JSON.stringify({
          season,
          soil_condition: soilCondition,
          fertilizer_recommendation: fertilizer,
          soil_ph: soilPh,
          rain_start: rainStart || null,
          rain_end: rainEnd || null,
          forecast_summary: forecast,
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
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed.";
      toast({ status: "error", title: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.900">
        Advisory
      </Heading>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700" fontSize="md">
          Soil
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="sm">Season</FormLabel>
              <Input value={season} onChange={(e) => setSeason(e.target.value)} />
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="sm">Condition</FormLabel>
              <Select value={soilCondition} onChange={(e) => setSoilCondition(e.target.value)}>
                <option value="Normal">Normal</option>
                <option value="Dry">Dry</option>
                <option value="Saturated">Saturated</option>
              </Select>
            </FormControl>
          </GridItem>
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl>
              <FormLabel fontSize="sm">Fertilizer recommendation</FormLabel>
              <Textarea value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} rows={2} />
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="sm">pH</FormLabel>
              <Select value={soilPh} onChange={(e) => setSoilPh(e.target.value)}>
                <option value="Acidic">Acidic</option>
                <option value="Neutral">Neutral</option>
                <option value="Alkaline">Alkaline</option>
              </Select>
            </FormControl>
          </GridItem>
        </Grid>
      </Stack>

      <Stack spacing={4} bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.100">
        <Text fontWeight="700" fontSize="md">
          Weather forecast
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <FormControl>
            <FormLabel fontSize="sm">Rain start</FormLabel>
            <Input type="date" value={rainStart} onChange={(e) => setRainStart(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Rain end</FormLabel>
            <Input type="date" value={rainEnd} onChange={(e) => setRainEnd(e.target.value)} />
          </FormControl>
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl>
              <FormLabel fontSize="sm">Summary</FormLabel>
              <Textarea value={forecast} onChange={(e) => setForecast(e.target.value)} rows={2} />
            </FormControl>
          </GridItem>
          <FormControl>
            <FormLabel fontSize="sm">Alert</FormLabel>
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
