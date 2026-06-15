import { useEffect, useRef, useState } from "react";
import {
  Title, Group, Button, TextInput, Table, Badge, Pagination, Modal, Select,
  Stack, ActionIcon, Menu, Text, Paper, LoadingOverlay, Box, Code, Divider, CopyButton, Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas } from "qrcode.react";
import {
  IconPlus, IconSearch, IconDotsVertical, IconUserOff, IconUserCheck, IconUsersGroup,
  IconPencil, IconQrcode, IconRefresh, IconDownload, IconCopy, IconCheck, IconCalendarCog,
} from "@tabler/icons-react";
import {
  listEmployees, createEmployee, updateEmployee, deactivateEmployee, activateEmployee,
  regenerateQr, listDepartments, listPositions,
} from "../api/employees";
import { apiErrorMessage } from "../api/client";
import AssignmentDrawer from "../components/AssignmentDrawer";
import SortableTh from "../components/SortableTh";
import type { Employee, Department, Position, EmployeeCreate } from "../types";

const PER_PAGE = 8;
const EMPLOYMENT = ["full_time", "part_time", "contract"];
const MODELS = ["hourly", "fixed_monthly", "per_shift", "mixed"];
const empty = {
  firstName: "", lastName: "", departmentId: "", positionId: "",
  employmentType: "full_time", payrollModel: "hourly", hireDate: null as Date | null,
};

export default function Employees() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("");
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [qrEmp, setQrEmp] = useState<Employee | null>(null);
  const [assignEmp, setAssignEmp] = useState<Employee | null>(null);

  const form = useForm({
    initialValues: { ...empty },
    validate: {
      firstName: (v) => (v.trim() ? null : t("employees.firstName")),
      lastName: (v) => (v.trim() ? null : t("employees.lastName")),
      departmentId: (v) => (v ? null : t("employees.department")),
      positionId: (v) => (v ? null : t("employees.position")),
      hireDate: (v) => (v ? null : t("employees.hireDate")),
    },
  });

  async function load() {
    setLoading(true);
    try {
      const res = await listEmployees({
        page, perPage: PER_PAGE, q: q || undefined,
        status: statusFilter || undefined,
        departmentId: deptFilter ? Number(deptFilter) : undefined,
        sortBy, sortDir,
      });
      setItems(res.data); setTotal(res.total);
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, statusFilter, deptFilter, sortBy, sortDir]);

  function onSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
    setPage(1);
  }
  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => {});
    listPositions().then(setPositions).catch(() => {});
  }, []);

  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? id;
  const posName = (id: number) => positions.find((p) => p.id === id)?.title ?? id;

  function openCreate() { setEditing(null); form.setValues({ ...empty }); form.resetDirty(); open(); }
  function openEdit(e: Employee) {
    setEditing(e);
    form.setValues({
      firstName: e.firstName, lastName: e.lastName,
      departmentId: String(e.departmentId), positionId: String(e.positionId),
      employmentType: e.employmentType, payrollModel: e.payrollModel,
      hireDate: e.hireDate ? new Date(e.hireDate) : null,
    });
    open();
  }
  function search() { setPage(1); load(); }

  async function submit(values: typeof form.values) {
    setSaving(true);
    const body: EmployeeCreate = {
      firstName: values.firstName, lastName: values.lastName,
      departmentId: Number(values.departmentId), positionId: Number(values.positionId),
      employmentType: values.employmentType, payrollModel: values.payrollModel,
      hireDate: values.hireDate!.toISOString().slice(0, 10),
    };
    try {
      if (editing) {
        await updateEmployee(editing.id, body);
        notifications.show({ color: "teal", title: t("common.saved"), message: t("employees.updated") });
      } else {
        await createEmployee(body);
        notifications.show({ color: "teal", title: t("common.saved"), message: t("employees.created") });
        setPage(1);
      }
      close(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setSaving(false); }
  }

  async function onActivate(e: Employee) {
    try {
      await activateEmployee(e.id);
      notifications.show({ color: "teal", message: t("employees.activated") });
      load();
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    }
  }

  function confirmDeactivate(e: Employee) {
    modals.openConfirmModal({
      title: t("employees.deactivate"),
      children: <Text size="sm">{t("employees.deactivateConfirm", { name: `${e.lastName} ${e.firstName}` })}</Text>,
      labels: { confirm: t("employees.deactivate"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deactivateEmployee(e.id);
          notifications.show({ color: "teal", message: t("employees.deactivated") });
          load();
        } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
      },
    });
  }

  const rows = items.map((e) => (
    <Table.Tr key={e.id}>
      <Table.Td>{e.lastName} {e.firstName}</Table.Td>
      <Table.Td>{deptName(e.departmentId)}</Table.Td>
      <Table.Td>{posName(e.positionId)}</Table.Td>
      <Table.Td><Badge variant="light" color="gray">{t(`enums.payrollModel.${e.payrollModel}`)}</Badge></Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <Text ff="monospace" size="xs">{e.qrToken}</Text>
          <Tooltip label={t("employees.qrCode")}>
            <ActionIcon size="sm" variant="subtle" onClick={() => setQrEmp(e)}><IconQrcode size={15} /></ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td><Badge color={e.status === "active" ? "teal" : "red"} variant="light">{t(`common.${e.status}`, { defaultValue: e.status })}</Badge></Table.Td>
      <Table.Td>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target><ActionIcon variant="subtle" color="gray"><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => openEdit(e)}>{t("employees.edit")}</Menu.Item>
            <Menu.Item leftSection={<IconQrcode size={16} />} onClick={() => setQrEmp(e)}>{t("employees.qrCode")}</Menu.Item>
            <Menu.Item leftSection={<IconCalendarCog size={16} />} onClick={() => setAssignEmp(e)}>{t("employees.shiftAndRate")}</Menu.Item>
            <Menu.Divider />
            {e.status === "active" ? (
              <Menu.Item color="red" leftSection={<IconUserOff size={16} />} onClick={() => confirmDeactivate(e)}>{t("employees.deactivate")}</Menu.Item>
            ) : (
              <Menu.Item color="teal" leftSection={<IconUserCheck size={16} />} onClick={() => onActivate(e)}>{t("employees.activate")}</Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>{t("employees.title")}</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>{t("employees.newEmployee")}</Button>
      </Group>

      <Group>
        <TextInput placeholder={t("employees.searchPlaceholder")} leftSection={<IconSearch size={16} />}
          value={q} onChange={(e) => setQ(e.currentTarget.value)} onKeyDown={(e) => e.key === "Enter" && search()} w={280} />
        <Button variant="default" onClick={search}>{t("common.search")}</Button>
        <Select w={150} placeholder={t("common.status")} value={statusFilter}
          onChange={(v) => { setPage(1); setStatusFilter(v); }}
          data={[{ value: "", label: t("common.all") }, { value: "active", label: t("common.active") }, { value: "inactive", label: t("common.inactive") }]} />
        <Select w={170} clearable placeholder={t("employees.department")} value={deptFilter}
          onChange={(v) => { setPage(1); setDeptFilter(v); }}
          data={departments.map((d) => ({ value: String(d.id), label: d.name }))} />
      </Group>

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <SortableTh label={t("employees.fullName")} field="lastName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                <Table.Th>{t("employees.department")}</Table.Th>
                <Table.Th>{t("employees.position")}</Table.Th><Table.Th>{t("employees.payrollModel")}</Table.Th>
                <Table.Th>{t("employees.qrToken")}</Table.Th>
                <SortableTh label={t("common.status")} field="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr><Table.Td colSpan={7}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconUsersGroup size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("employees.notFound")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {total > PER_PAGE && (
        <Group justify="flex-end"><Pagination total={Math.ceil(total / PER_PAGE)} value={page} onChange={setPage} /></Group>
      )}

      <Modal opened={opened} onClose={close} title={editing ? t("employees.editTitle") : t("employees.newEmployee")} centered>
        <Box pos="relative">
          <LoadingOverlay visible={saving} />
          <form onSubmit={form.onSubmit(submit)}>
            <Stack>
              <Group grow>
                <TextInput label={t("employees.firstName")} withAsterisk {...form.getInputProps("firstName")} />
                <TextInput label={t("employees.lastName")} withAsterisk {...form.getInputProps("lastName")} />
              </Group>
              <Select label={t("employees.department")} withAsterisk searchable
                data={departments.map((d) => ({ value: String(d.id), label: d.name }))} {...form.getInputProps("departmentId")} />
              <Select label={t("employees.position")} withAsterisk searchable
                data={positions.map((p) => ({ value: String(p.id), label: p.title }))} {...form.getInputProps("positionId")} />
              <Group grow>
                <Select label={t("employees.employmentType")} data={EMPLOYMENT.map((x) => ({ value: x, label: t(`enums.employmentType.${x}`) }))} {...form.getInputProps("employmentType")} />
                <Select label={t("employees.payrollModel")} data={MODELS.map((x) => ({ value: x, label: t(`enums.payrollModel.${x}`) }))} {...form.getInputProps("payrollModel")} />
              </Group>
              <DateInput label={t("employees.hireDate")} withAsterisk valueFormat="YYYY-MM-DD" {...form.getInputProps("hireDate")} />
              <Group justify="flex-end" mt="sm">
                <Button variant="default" onClick={close}>{t("common.cancel")}</Button>
                <Button type="submit" loading={saving}>{editing ? t("common.save") : t("common.save")}</Button>
              </Group>
            </Stack>
          </form>
        </Box>
      </Modal>

      <QrModal emp={qrEmp} onClose={() => setQrEmp(null)}
        onRegenerated={(updated) => { setQrEmp(updated); setItems((xs) => xs.map((x) => (x.id === updated.id ? updated : x))); }} />

      <AssignmentDrawer emp={assignEmp} onClose={() => setAssignEmp(null)} />
    </Stack>
  );
}

function QrModal({ emp, onClose, onRegenerated }: {
  emp: Employee | null; onClose: () => void; onRegenerated: (e: Employee) => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !emp) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr_${emp.lastName}_${emp.firstName}.png`;
    a.click();
  }

  function regenerate() {
    if (!emp) return;
    modals.openConfirmModal({
      title: t("employees.newQr"),
      children: <Text size="sm">{t("employees.regenerateConfirm")}</Text>,
      labels: { confirm: t("employees.newQr"), cancel: t("common.cancel") },
      confirmProps: { color: "orange" },
      onConfirm: async () => {
        setBusy(true);
        try {
          const updated = await regenerateQr(emp.id);
          notifications.show({ color: "teal", message: t("employees.regenerated") });
          onRegenerated(updated);
        } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
        finally { setBusy(false); }
      },
    });
  }

  return (
    <Modal opened={!!emp} onClose={onClose} title={emp ? t("employees.qrTitle", { name: `${emp.lastName} ${emp.firstName}` }) : ""} centered size="sm">
      {emp && (
        <Stack align="center" gap="md">
          <Paper withBorder p="md" radius="md" bg="white">
            <QRCodeCanvas ref={canvasRef} value={emp.qrToken ?? ""} size={200} level="M" includeMargin />
          </Paper>
          <Group gap={6}>
            <Code>{emp.qrToken}</Code>
            <CopyButton value={emp.qrToken ?? ""}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? t("employees.copied") : t("employees.copy")}>
                  <ActionIcon variant="subtle" color={copied ? "teal" : "gray"} onClick={copy}>
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          <Text size="xs" c="dimmed" ta="center">{t("employees.qrHint")}</Text>
          <Divider w="100%" />
          <Group w="100%" grow>
            <Button variant="light" leftSection={<IconDownload size={16} />} onClick={download}>{t("employees.downloadPng")}</Button>
            <Button variant="light" color="orange" leftSection={<IconRefresh size={16} />} loading={busy} onClick={regenerate}>{t("employees.newQr")}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
