import {
  Badge,
  Box,
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
import { type EthiopiaRegionId, formatDistrictLabel, regionLabel } from "@/agriSms/constants";
import { apiFetch } from "@/api/client";
import { ApiError } from "@/api/errors";
import { useAuth } from "@/hooks/useAuth";
import {
  farmerJurisdictionLine,
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

export function KebeleFarmersPage() {
  const toast = useToast();
  const { user } = useAuth();
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

  function resetForm(f?: SmsFarmerRow | null) {
    if (f) {
      setFormName(f.full_name);
      setFormPhone(f.phone_number.startsWith("+251") ? `0${f.phone_number.slice(4)}` : f.phone_number);
      setFormLang(apiLangToSelect(f.language));
      setFormActive(f.is_active);
    } else {
      setFormName("");
      setFormPhone("");
      setFormLang("Amharic");
      setFormActive(true);
    }
  }

  async function submitAdd() {
    if (!scopedRegionId || scopedDistrictNum == null) {
      toast({ status: "warning", title: "Missing jurisdiction on your account." });
      return;
    }
    try {
      await apiFetch("/api/v1/agri-sms/farmers", {
        method: "POST",
        body: JSON.stringify({
          full_name: formName.trim(),
          phone_number: formPhone.trim(),
          language: selectToApiLang(formLang),
          region_state: scopedRegionId,
          district_number: scopedDistrictNum,
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
    try {
      await apiFetch(`/api/v1/agri-sms/farmers/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: formName.trim(),
          phone_number: formPhone.trim(),
          language: selectToApiLang(formLang),
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

  const jurisdictionLine = formatJurisdictionLine(scopedRegionId, scopedDistrictNum, "en");

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
              <Th>Region</Th>
              <Th>District</Th>
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
                  {f.region_state ? regionLabel(f.region_state as EthiopiaRegionId, "en") : "—"}
                </Td>
                <Td fontSize="sm">
                  {f.district_number != null ? formatDistrictLabel(f.district_number, "en") : "—"}
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
                <FormLabel>Jurisdiction</FormLabel>
                <Box
                  px={3}
                  py={2.5}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor="gray.200"
                  bg="gray.50"
                >
                  <Text fontSize="sm" fontWeight="500" color="gray.800">
                    {jurisdictionLine}
                  </Text>
                </Box>
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
                  <FormLabel>Jurisdiction</FormLabel>
                  <Box
                    px={3}
                    py={2.5}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                    bg="gray.50"
                  >
                    <Text fontSize="sm" fontWeight="500" color="gray.800">
                      {farmerJurisdictionLine(editing, "en")}
                    </Text>
                  </Box>
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
