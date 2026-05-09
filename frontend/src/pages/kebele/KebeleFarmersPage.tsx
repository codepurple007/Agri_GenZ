import {
  Badge,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_KEBELE_SCOPE,
  DISTRICT_NUMBERS,
  KEBELE_UNIT_IDS,
  formatDistrictLabel,
  kebeleUnitLabel,
  type SmsKebeleUnitId,
} from "@/agriSms/constants";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { useAuth } from "@/hooks/useAuth";
import { getStoredLocale, type Locale } from "@/i18n/landing";
import {
  coalesceDistrictNum,
  formatJurisdictionLine,
  resolveSmsWorkerJurisdiction,
} from "@/pages/kebele/kebeleScope";

type SmsFarmerRow = {
  id: string;
  farmer_code: string;
  full_name: string;
  phone_number: string;
  language: string;
  kebele: string;
  region_state?: string;
  district_number?: number;
  crops: string[];
  is_active: boolean;
  consent_given: boolean;
};

const langOptions = [
  { v: "Amharic", l: "Amharic" },
  { v: "Oromo", l: "Afaan Oromoo" },
  { v: "English", l: "English" },
];

function apiLangToSelect(api: string): string {
  if (api === "Oromo") return "Oromo";
  return api;
}

function selectToApiLang(v: string): string {
  return v;
}

function resolveUiLocale(): Locale {
  const s = getStoredLocale();
  return s === "am" || s === "om" || s === "en" ? s : "en";
}

export function KebeleFarmersPage() {
  const toast = useToast();
  const { user } = useAuth();
  const uiLocale = resolveUiLocale();
  const { regionId: scopedRegionId, districtNum: scopedDistrictNum } = resolveSmsWorkerJurisdiction(user);

  const [rows, setRows] = useState<SmsFarmerRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const [editing, setEditing] = useState<SmsFarmerRow | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLang, setFormLang] = useState("Amharic");
  const [formRegion, setFormRegion] = useState<SmsKebeleUnitId>(
    scopedRegionId ?? KEBELE_UNIT_IDS[0],
  );
  const [formDistrict, setFormDistrict] = useState<string>(
    String(scopedDistrictNum ?? DISTRICT_NUMBERS[0]),
  );
  const [formActive, setFormActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      const path = `/api/v1/agri-sms/farmers${q.toString() ? `?${q}` : ""}`;
      const data = await apiFetch<{ farmers: SmsFarmerRow[] }>(path);
      setRows(data.farmers);
    } catch {
      toast({ status: "error", title: "Failed." });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function jurisdictionDefaultsFromScoped(): [SmsKebeleUnitId, string] {
    const r = scopedRegionId ?? DEMO_KEBELE_SCOPE.region;
    const rawD = scopedDistrictNum ?? DEMO_KEBELE_SCOPE.district;
    const d = coalesceDistrictNum(rawD) ?? DEMO_KEBELE_SCOPE.district;
    const region = (KEBELE_UNIT_IDS as readonly string[]).includes(r)
      ? (r as SmsKebeleUnitId)
      : DEMO_KEBELE_SCOPE.region;
    return [region, String(d)];
  }

  function resetForm(f?: SmsFarmerRow | null) {
    if (f) {
      const [fallbackR, fallbackD] = jurisdictionDefaultsFromScoped();
      setFormName(f.full_name);
      setFormPhone(f.phone_number.startsWith("+251") ? `0${f.phone_number.slice(4)}` : f.phone_number);
      setFormLang(apiLangToSelect(f.language));
      setFormActive(f.is_active);
      const rid =
        typeof f.region_state === "string" && (KEBELE_UNIT_IDS as readonly string[]).includes(f.region_state)
          ? (f.region_state as SmsKebeleUnitId)
          : fallbackR;
      setFormRegion(rid);
      const dn = coalesceDistrictNum(f.district_number) ?? Number(fallbackD);
      setFormDistrict(String(dn >= 1 && dn <= 5 ? dn : Number(fallbackD)));
    } else {
      const [r, ds] = jurisdictionDefaultsFromScoped();
      setFormName("");
      setFormPhone("");
      setFormLang("Amharic");
      setFormRegion(r);
      setFormDistrict(ds);
      setFormActive(true);
    }
  }

  async function submitAdd() {
    const dn = coalesceDistrictNum(Number(formDistrict));
    if (!(KEBELE_UNIT_IDS as readonly string[]).includes(formRegion) || dn == null) {
      toast({ status: "warning", title: "Choose a valid kebele unit and district (1–5)." });
      return;
    }
    try {
      await apiFetch("/api/v1/agri-sms/farmers", {
        method: "POST",
        body: JSON.stringify({
          full_name: formName.trim(),
          phone_number: formPhone.trim(),
          language: selectToApiLang(formLang),
          region_state: formRegion,
          district_number: dn,
          crops: [],
        }),
      });
      toast({ status: "success", title: "Saved." });
      addModal.onClose();
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed";
      toast({ status: "error", title: msg });
    }
  }

  async function submitEdit() {
    if (!editing) return;
    const dn = coalesceDistrictNum(Number(formDistrict));
    if (!(KEBELE_UNIT_IDS as readonly string[]).includes(formRegion) || dn == null) {
      toast({ status: "warning", title: "Choose a valid kebele unit and district (1–5)." });
      return;
    }
    try {
      await apiFetch(`/api/v1/agri-sms/farmers/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: formName.trim(),
          phone_number: formPhone.trim(),
          language: selectToApiLang(formLang),
          region_state: formRegion,
          district_number: dn,
          is_active: formActive,
          crops: editing.crops,
        }),
      });
      toast({ status: "success", title: "Saved." });
      editModal.onClose();
      setEditing(null);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed";
      toast({ status: "error", title: msg });
    }
  }

  async function deactivate(f: SmsFarmerRow) {
    try {
      await apiFetch(`/api/v1/agri-sms/farmers/${encodeURIComponent(f.id)}`, { method: "DELETE" });
      toast({ status: "info", title: "Inactive." });
      await load();
    } catch {
      toast({ status: "error", title: "Failed." });
    }
  }

  const tableRows = useMemo(() => rows, [rows]);

  const jurisdictionLine = formatJurisdictionLine(scopedRegionId, scopedDistrictNum, uiLocale);

  return (
    <Stack spacing={6}>
      <Text fontWeight="700" fontSize="xl" color="brand.900">
        Farmers
      </Text>
      <Text fontSize="sm" color="gray.700" bg="green.50" borderRadius="md" px={3} py={2} borderWidth="1px" borderColor="green.100">
        Your desk shows only farmers in <strong>{jurisdictionLine}</strong> (from your login scope).
      </Text>

      <HStack spacing={3} wrap="wrap" align="flex-end">
        <FormControl maxW="220px">
          <FormLabel fontSize="sm">Search</FormLabel>
          <Input size="md" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or phone" />
        </FormControl>
        <Button colorScheme="green" variant="outline" onClick={() => void load()} isLoading={loading}>
          Apply
        </Button>
        <Button
          colorScheme="green"
          onClick={() => {
            resetForm(null);
            addModal.onOpen();
          }}
        >
          Add farmer
        </Button>
      </HStack>

      <TableContainer bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.100">
        <Table size="sm">
          <Thead bg="green.50">
            <Tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Lang</Th>
              <Th>{uiLocale === "am" ? "ቀበሌ" : uiLocale === "om" ? "Ganda" : "Kebele"}</Th>
              <Th>{uiLocale === "am" ? "ወረዳ" : uiLocale === "om" ? "Diristiriktii" : "District"}</Th>
              <Th>Status</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {tableRows.map((f) => (
              <Tr key={f.id} opacity={f.is_active ? 1 : 0.65}>
                <Td fontFamily="mono" fontSize="xs">
                  {f.farmer_code}
                </Td>
                <Td>{f.full_name}</Td>
                <Td>{f.phone_number}</Td>
                <Td>{f.language === "Oromo" ? "Oromoo" : f.language}</Td>
                <Td fontSize="sm">
                  {f.region_state && (KEBELE_UNIT_IDS as readonly string[]).includes(f.region_state)
                    ? kebeleUnitLabel(f.region_state as SmsKebeleUnitId, uiLocale)
                    : "—"}
                </Td>
                <Td fontSize="sm">
                  {f.district_number != null ? formatDistrictLabel(f.district_number, uiLocale) : "—"}
                </Td>
                <Td>
                  <Badge colorScheme={f.is_active ? "green" : "red"}>{f.is_active ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td textAlign="right">
                  <HStack justify="flex-end" spacing={1}>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setEditing(f);
                        resetForm(f);
                        editModal.onOpen();
                      }}
                    >
                      Edit
                    </Button>
                    {f.is_active ? (
                      <Button size="xs" variant="ghost" colorScheme="red" onClick={() => void deactivate(f)}>
                        Deactivate
                      </Button>
                    ) : null}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add farmer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl isRequired>
                <FormLabel>Full name</FormLabel>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09XXXXXXXX" />
              </FormControl>
              <FormControl>
                <FormLabel>Language</FormLabel>
                <Select value={formLang} onChange={(e) => setFormLang(e.target.value)}>
                  {langOptions.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>
                  {uiLocale === "am" ? "ቀበሌ / ወረዳ" : uiLocale === "om" ? "Ganda / Diristiriktii" : "Kebele & district"}
                </FormLabel>
                <Stack direction={{ base: "column", md: "row" }} spacing={3}>
                  <Select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value as SmsKebeleUnitId)}
                  >
                    {KEBELE_UNIT_IDS.map((id) => (
                      <option key={id} value={id}>
                        {kebeleUnitLabel(id, uiLocale)}
                      </option>
                    ))}
                  </Select>
                  <Select value={formDistrict} onChange={(e) => setFormDistrict(e.target.value)} maxW={{ md: "200px" }}>
                    {DISTRICT_NUMBERS.map((n) => (
                      <option key={n} value={String(n)}>
                        {formatDistrictLabel(n, uiLocale)}
                      </option>
                    ))}
                  </Select>
                </Stack>
                <Text fontSize="xs" color="gray.600" mt={2}>
                  Default is your logged-in jurisdiction ({jurisdictionLine}). Change when registering a farmer in
                  another kebele or district—they may not appear in this desk&apos;s filtered list afterward.
                </Text>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={addModal.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={() => void submitAdd()}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.onClose();
          setEditing(null);
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit farmer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl isRequired>
                <FormLabel>Full name</FormLabel>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Language</FormLabel>
                <Select value={formLang} onChange={(e) => setFormLang(e.target.value)}>
                  {langOptions.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {editing ? (
                <FormControl>
                  <FormLabel>
                    {uiLocale === "am" ? "ቀበሌ / ወረዳ" : uiLocale === "om" ? "Ganda / Diristiriktii" : "Kebele & district"}
                  </FormLabel>
                  <Stack direction={{ base: "column", md: "row" }} spacing={3}>
                    <Select
                      value={formRegion}
                      onChange={(e) => setFormRegion(e.target.value as SmsKebeleUnitId)}
                    >
                      {KEBELE_UNIT_IDS.map((id) => (
                        <option key={id} value={id}>
                          {kebeleUnitLabel(id, uiLocale)}
                        </option>
                      ))}
                    </Select>
                    <Select value={formDistrict} onChange={(e) => setFormDistrict(e.target.value)} maxW={{ md: "200px" }}>
                      {DISTRICT_NUMBERS.map((n) => (
                        <option key={n} value={String(n)}>
                          {formatDistrictLabel(n, uiLocale)}
                        </option>
                      ))}
                    </Select>
                  </Stack>
                </FormControl>
              ) : null}
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Active</FormLabel>
                <Switch isChecked={formActive} onChange={(e) => setFormActive(e.target.checked)} colorScheme="green" />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              variant="ghost"
              onClick={() => {
                editModal.onClose();
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button colorScheme="green" onClick={() => void submitEdit()}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
