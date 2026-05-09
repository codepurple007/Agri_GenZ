import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { publicApiFetch, ApiError } from "@/api/client";
import {
  DISTRICT_NUMBERS,
  KEBELE_UNIT_IDS,
  type SmsKebeleUnitId,
  formatDistrictLabel,
  kebeleUnitLabel,
} from "@/agriSms/constants";
import { AgriServiceLogo } from "@/components/brand/AgriServiceLogo";
import type { Locale } from "@/i18n/landing";
import { getStoredLocale, storeLocale } from "@/i18n/landing";
import { farmerRegisterCopy } from "@/pages/farmer/farmerRegisterCopy";
import { OfflineBanner } from "@/pages/login/OfflineBanner";

function detectLocale(): Locale {
  const s = getStoredLocale();
  if (s === "en" || s === "am" || s === "om") return s;
  const nav = navigator.language?.toLowerCase() ?? "en";
  if (nav.startsWith("am")) return "am";
  if (nav.startsWith("om")) return "om";
  return "en";
}

type RegisterRes = {
  ok: boolean;
  farmer?: { farmer_code: string };
};

function mapLanguageToApi(v: string): string {
  if (v === "Afaan Oromoo") return "Oromo";
  return v;
}

const CROP_ROWS = [
  ["Wheat", "cropWheat"],
  ["Teff", "cropTeff"],
  ["Maize", "cropMaize"],
  ["Barley", "cropBarley"],
] as const;

export function FarmerSmsRegisterPage() {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [langUi, setLangUi] = useState("Amharic");
  const [kebeleUnitId, setKebeleUnitId] = useState<SmsKebeleUnitId>("kebele_1");
  const [districtNum, setDistrictNum] = useState(1);
  const [crops, setCrops] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [farmerCode, setFarmerCode] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    storeLocale(locale);
  }, [locale]);

  useEffect(() => {
    function up() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);

  const t = farmerRegisterCopy[locale];

  const langButtons = useMemo(
    () =>
      ([
        ["en", "EN"],
        ["am", "አማ"],
        ["om", "Om"],
      ] as const).map(([k, lab]) => (
        <Button
          key={k}
          size="sm"
          variant={locale === k ? "solid" : "outline"}
          colorScheme="green"
          onClick={() => setLocale(k)}
          aria-pressed={locale === k}
          minW="44px"
          minH={{ base: "44px", md: "32px" }}
        >
          {lab}
        </Button>
      )),
    [locale],
  );

  function toggleCrop(k: string) {
    setCrops((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent || !online) return;
    setBusy(true);
    try {
      const data = await publicApiFetch<RegisterRes>("/api/v1/agri-sms/farmers/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          language: mapLanguageToApi(langUi),
          region_state: kebeleUnitId,
          district_number: districtNum,
          consent_given: true,
          crops,
        }),
      });
      if (data.ok && data.farmer?.farmer_code) {
        setFarmerCode(data.farmer.farmer_code);
      }
      setDone(true);
      toast({ status: "success", title: t.successTitle });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed.";
      toast({ status: "error", title: msg });
    } finally {
      setBusy(false);
    }
  }

  const touchFieldSx = { fontSize: { base: "16px", md: "md" }, minH: { base: "48px", md: "40px" } };

  return (
    <Flex
      direction="column"
      minH="100dvh"
      pb="calc(16px + env(safe-area-inset-bottom, 0px))"
      bg="linear-gradient(165deg, #e9f5ec 0%, #f7faf7 45%, #ffffff 100%)"
    >
      {!online ? <OfflineBanner message={t.offline} /> : null}

      <Flex
        align="flex-start"
        justify="space-between"
        gap={4}
        px={{ base: "max(16px, env(safe-area-inset-left))", md: 10 }}
        pr={{ base: "max(16px, env(safe-area-inset-right))", md: 10 }}
        py={5}
        wrap="wrap"
        borderBottomWidth="1px"
        borderColor="green.100"
        bg="whiteAlpha.950"
      >
        <Flex align="center" gap={3} minW={0} flex="1 1 160px">
          <AgriServiceLogo size={40} />
          <Heading size="sm" color="brand.900" pt={0.5} noOfLines={1}>
            AgriSMS
          </Heading>
        </Flex>
        <Flex gap={2} align="center" wrap="wrap" flex="1 1 auto" justify={{ base: "flex-start", sm: "flex-end" }}>
          {langButtons}
          <Button as={Link} to="/" variant="ghost" colorScheme="green" size="sm" minH={{ base: "44px", md: "32px" }}>
            ← {t.backHome}
          </Button>
        </Flex>
      </Flex>

      <Flex
        flex="1"
        justify="center"
        px={{ base: "max(16px, env(safe-area-inset-left))", md: 6 }}
        pr={{ base: "max(16px, env(safe-area-inset-right))", md: 6 }}
        py={{ base: 6, md: 12 }}
      >
        <Box w="full" maxW="md">
          {done ? (
            <Stack spacing={5} textAlign="center" py={10} align="center">
              <Flex justify="center">
                <AgriServiceLogo size={56} />
              </Flex>
              <Heading size="lg" color="brand.900">
                {t.successTitle}
              </Heading>
              {farmerCode ? (
                <Text fontSize="md" fontWeight="600" color="green.700">
                  {farmerCode}
                </Text>
              ) : null}
              <Button as={Link} to="/" colorScheme="green" size="lg">
                {t.backHome}
              </Button>
            </Stack>
          ) : (
            <Box bg="white" borderRadius="2xl" boxShadow="0 12px 40px rgba(27,67,50,0.08)" borderWidth="1px" borderColor="green.100" p={{ base: 5, md: 8 }}>
              <Heading size="lg" color="brand.900" mb={6}>
                {t.title}
              </Heading>
              <form onSubmit={submit}>
                <Stack spacing={{ base: 5, md: 4 }}>
                  <FormControl isRequired>
                    <FormLabel>{t.fullName}</FormLabel>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      size="lg"
                      autoComplete="name"
                      sx={touchFieldSx}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>{t.phone}</FormLabel>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      size="lg"
                      inputMode="numeric"
                      placeholder="09XXXXXXXX"
                      autoComplete="tel"
                      sx={touchFieldSx}
                    />
                    <FormHelperText fontSize="xs">{t.phoneHint}</FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel>{t.language}</FormLabel>
                    <Select size="lg" value={langUi} onChange={(e) => setLangUi(e.target.value)} sx={touchFieldSx}>
                      <option value="Amharic">Amharic / አማርኛ</option>
                      <option value="Afaan Oromoo">Afaan Oromoo</option>
                      <option value="English">English</option>
                    </Select>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>{t.kebele}</FormLabel>
                    <Select
                      size="lg"
                      value={kebeleUnitId}
                      onChange={(e) => setKebeleUnitId(e.target.value as SmsKebeleUnitId)}
                      sx={touchFieldSx}
                    >
                      {KEBELE_UNIT_IDS.map((id) => (
                        <option key={id} value={id}>
                          {kebeleUnitLabel(id, locale)}
                        </option>
                      ))}
                    </Select>
                    <FormHelperText fontSize="sm" color="gray.600" mt={1.5}>
                      {t.kebeleHint}
                    </FormHelperText>
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>{t.district}</FormLabel>
                    <Select
                      size="lg"
                      value={String(districtNum)}
                      onChange={(e) => setDistrictNum(Number(e.target.value))}
                      sx={touchFieldSx}
                    >
                      {DISTRICT_NUMBERS.map((n) => (
                        <option key={n} value={String(n)}>
                          {formatDistrictLabel(n, locale)}
                        </option>
                      ))}
                    </Select>
                    <FormHelperText fontSize="sm" color="gray.600" mt={1.5}>
                      {t.districtHint}
                    </FormHelperText>
                  </FormControl>
                  <FormControl>
                    <FormLabel>{t.cropsLabel}</FormLabel>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                      {CROP_ROWS.map(([key, lc]) => (
                        <Checkbox
                          key={key}
                          isChecked={crops.includes(key)}
                          onChange={() => toggleCrop(key)}
                          colorScheme="green"
                          size="lg"
                          sx={{ alignItems: "flex-start", ".chakra-checkbox__label": { lineHeight: "1.35", pt: "2px" } }}
                        >
                          {t[lc]}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>
                  <Checkbox
                    isChecked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    colorScheme="green"
                    size="lg"
                    sx={{ alignItems: "flex-start", ".chakra-checkbox__label": { lineHeight: "1.35", pt: "2px" } }}
                  >
                    {t.consent}
                  </Checkbox>
                  <Button
                    type="submit"
                    colorScheme="green"
                    size="lg"
                    w="full"
                    minH="52px"
                    isLoading={busy}
                    isDisabled={!consent || !online}
                  >
                    {t.submit}
                  </Button>
                </Stack>
              </form>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
