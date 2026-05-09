import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  Heading,
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
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/errors";
import { apiFetch } from "@/api/client";

type AccountRow = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  sms_region?: string | null;
  sms_district?: number | null;
  source?: string | null;
};

export function SuperAdminStaffPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"kebele_worker" | "voice_recorder_officer">("voice_recorder_officer");
  const [fullName, setFullName] = useState("");
  const [smsRegion, setSmsRegion] = useState("kebele_3");
  const [smsDistrict, setSmsDistrict] = useState("3");
  const [createPending, setCreatePending] = useState(false);
  const [credentialFlash, setCredentialFlash] = useState<string | null>(null);

  const editDlg = useDisclosure();
  const deleteDlg = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [editRow, setEditRow] = useState<AccountRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<"kebele_worker" | "voice_recorder_officer">("kebele_worker");
  const [editSmsRegion, setEditSmsRegion] = useState("kebele_3");
  const [editSmsDistrict, setEditSmsDistrict] = useState("3");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPending, setEditPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<{ ok: boolean; accounts: AccountRow[] }>("/api/v1/superadmin/staff-accounts");
      setAccounts(data.accounts ?? []);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Could not load accounts.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(a: AccountRow) {
    setEditRow(a);
    setEditFullName(a.full_name);
    const r =
      a.role === "voice_recorder_officer"
        ? "voice_recorder_officer"
        : "kebele_worker";
    setEditRole(r);
    setEditSmsRegion((a.sms_region ?? "kebele_3").trim() || "kebele_3");
    setEditSmsDistrict(String(a.sms_district ?? 3));
    setEditPhone("");
    setEditPassword("");
    editDlg.onOpen();
  }

  function openDelete(a: AccountRow) {
    setDeleteTarget(a);
    deleteDlg.onOpen();
  }

  async function submitCreate() {
    setCreatePending(true);
    setCredentialFlash(null);
    try {
      const body: Record<string, unknown> = {
        username,
        password: password.trim() ? password : undefined,
        role,
        fullName,
      };
      if (role === "kebele_worker") {
        body.sms_region = smsRegion.trim() || "kebele_3";
        body.sms_district = Number(smsDistrict) || 3;
      }
      const data = await apiFetch<{
        ok: boolean;
        initial_password_shown_once?: string;
      }>("/api/v1/superadmin/staff-accounts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast({ status: "success", title: "Account created." });
      const pw = data.initial_password_shown_once;
      if (pw) setCredentialFlash(pw);
      setUsername("");
      setPassword("");
      setFullName("");
      await load();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Failed." });
    } finally {
      setCreatePending(false);
    }
  }

  async function submitEdit() {
    if (!editRow) return;
    setEditPending(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: editFullName.trim(),
        role: editRole,
      };
      if (editRole === "kebele_worker") {
        payload.sms_region = editSmsRegion.trim();
        payload.sms_district = Number(editSmsDistrict);
      }
      const ph = editPhone.trim();
      if (ph) payload.phone = ph;
      const pw = editPassword.trim();
      if (pw) payload.password = pw;

      await apiFetch(`/api/v1/superadmin/staff-accounts/${encodeURIComponent(editRow.username)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast({ status: "success", title: "Saved." });
      editDlg.onClose();
      setEditRow(null);
      await load();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Update failed." });
    } finally {
      setEditPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await apiFetch(`/api/v1/superadmin/staff-accounts/${encodeURIComponent(deleteTarget.username)}`, {
        method: "DELETE",
      });
      toast({ status: "success", title: "Removed." });
      deleteDlg.onClose();
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({ status: "error", title: e instanceof ApiError ? e.message : "Delete failed." });
    } finally {
      setDeletePending(false);
    }
  }

  if (loadErr) {
    return (
      <Text color="red.600" role="alert">
        {loadErr}
      </Text>
    );
  }

  const editRoleShowsSms = editRole === "kebele_worker";

  return (
    <Stack spacing={8}>
      <Heading size="md" color="cyan.900">
        Provision staff accounts
      </Heading>
      <Text fontSize="sm" color="gray.700">
        Create username/password JWT staff for Kebele workers or Voice Recorder Officers. Password is shown once when
        you create an account — store it securely.
      </Text>

      {credentialFlash ? (
        <Stack direction="row" align="center" spacing={3} bg="orange.50" p={4} borderRadius="md">
          <Text fontSize="sm" wordBreak="break-all">
            <strong>New password:</strong> {credentialFlash}
          </Text>
          <Button size="xs" variant="outline" onClick={() => void navigator.clipboard.writeText(credentialFlash)}>
            Copy
          </Button>
        </Stack>
      ) : null}

      <Stack
        spacing={4}
        as="fieldset"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="lg"
        p={{ base: 4, md: 5 }}
        bg="white"
      >
        <Text as="legend" fontWeight="700" px={2} fontSize="sm">
          Add account
        </Text>
        <FormControl>
          <FormLabel fontSize="sm">Username</FormLabel>
          <Input size="sm" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Password (leave blank for auto-generated)</FormLabel>
          <Input size="sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Full name</FormLabel>
          <Input size="sm" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Role</FormLabel>
          <Select size="sm" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="kebele_worker">Kebele Worker (SMS unit)</option>
            <option value="voice_recorder_officer">Voice Recorder Officer</option>
          </Select>
        </FormControl>
        {role === "kebele_worker" ? (
          <Stack direction={{ base: "column", md: "row" }} spacing={4}>
            <FormControl flex={1}>
              <FormLabel fontSize="sm">SMS region unit</FormLabel>
              <Input size="sm" placeholder="kebele_4" value={smsRegion} onChange={(e) => setSmsRegion(e.target.value)} />
            </FormControl>
            <FormControl flex={1}>
              <FormLabel fontSize="sm">District 1–5</FormLabel>
              <Select size="sm" value={smsDistrict} onChange={(e) => setSmsDistrict(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    District {n}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Stack>
        ) : null}
        <Button
          colorScheme="cyan"
          size="sm"
          maxW="xs"
          onClick={() => void submitCreate()}
          isLoading={createPending}
          isDisabled={!username.trim() || fullName.trim().length < 2}
        >
          Create
        </Button>
      </Stack>

      <Stack spacing={3}>
        <Heading size="sm">Kebele & Voice staff roster</Heading>
        <TableContainer bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Username</Th>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Scope</Th>
                <Th>Source</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {accounts.length === 0 ? (
                <Tr>
                  <Td colSpan={6}>
                    <Text fontSize="sm">No rows.</Text>
                  </Td>
                </Tr>
              ) : (
                accounts.map((a) => (
                  <Tr key={`${a.id}-${a.username}`}>
                    <Td>{a.username}</Td>
                    <Td>{a.full_name}</Td>
                    <Td fontSize="xs">{a.role}</Td>
                    <Td fontSize="xs">
                      {a.sms_region && a.sms_district != null ? `${a.sms_region} · ${a.sms_district}` : "—"}
                    </Td>
                    <Td fontSize="xs">{a.source ?? "—"}</Td>
                    <Td textAlign="right">
                      <Stack direction="row" spacing={1} justify="flex-end">
                        <Button size="xs" variant="outline" onClick={() => openEdit(a)}>
                          Edit
                        </Button>
                        <Button size="xs" colorScheme="red" variant="ghost" onClick={() => openDelete(a)}>
                          Delete
                        </Button>
                      </Stack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Stack>

      <Modal isOpen={editDlg.isOpen} onClose={editDlg.onClose}>
        <ModalOverlay />
        <ModalContent maxW="md">
          <ModalHeader>Edit staff</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Username</FormLabel>
                <Input size="sm" value={editRow?.username ?? ""} isReadOnly bg="gray.50" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Full name</FormLabel>
                <Input size="sm" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Role</FormLabel>
                <Select size="sm" value={editRole} onChange={(e) => setEditRole(e.target.value as typeof editRole)}>
                  <option value="kebele_worker">Kebele Worker</option>
                  <option value="voice_recorder_officer">Voice Recorder Officer</option>
                </Select>
              </FormControl>
              {editRoleShowsSms ? (
                <Stack direction={{ base: "column", md: "row" }} spacing={3}>
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm">SMS region unit</FormLabel>
                    <Input size="sm" value={editSmsRegion} onChange={(e) => setEditSmsRegion(e.target.value)} />
                  </FormControl>
                  <FormControl flex={1} maxW={{ md: "160px" }}>
                    <FormLabel fontSize="sm">District</FormLabel>
                    <Select size="sm" value={editSmsDistrict} onChange={(e) => setEditSmsDistrict(e.target.value)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              ) : null}
              <FormControl>
                <FormLabel fontSize="sm">Phone (E.164 or 09…)</FormLabel>
                <Input
                  size="sm"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">New password</FormLabel>
                <Input
                  size="sm"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank unchanged (min 8 or demo)"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={editDlg.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="cyan"
              onClick={() => void submitEdit()}
              isLoading={editPending}
              isDisabled={editFullName.trim().length < 2}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={deleteDlg.isOpen} leastDestructiveRef={cancelDeleteRef} onClose={deleteDlg.onClose}>
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete staff account
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody>
            Remove <strong>{deleteTarget?.username}</strong>? Built-in presets can be re-added only by restarting the API
            (backend) or refreshing the demo page (offline mock).
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelDeleteRef} onClick={deleteDlg.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={3} onClick={() => void confirmDelete()} isLoading={deletePending}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
}
