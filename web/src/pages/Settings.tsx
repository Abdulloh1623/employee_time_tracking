import { useEffect, useState } from "react";
import {
  Stack, Title, Tabs, Table, Button, Group, Modal, TextInput, NumberInput, Switch,
  Select, ActionIcon, Text, Badge, LoadingOverlay, Paper,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import {
  IconBuilding, IconBriefcase, IconBeach, IconCalendarStar, IconPlus, IconPencil, IconTrash,
} from "@tabler/icons-react";
import { listEmployees, listDepartments, listPositions } from "../api/employees";
import {
  createDepartment, updateDepartment, deleteDepartment,
  createPosition, updatePosition, deletePosition,
  listHolidays, createHoliday, updateHoliday, deleteHoliday,
} from "../api/org";
import { listLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from "../api/leave";
import { apiErrorMessage } from "../api/client";
import type { Department, Position, LeaveType, Holiday, Employee } from "../types";

const DAY_TYPES = ["holiday", "weekend", "workday"];
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default function Settings() {
  const { t } = useTranslation();
  return (
    <Stack gap="md">
      <Title order={2}>{t("settings.title")}</Title>
      <Paper withBorder radius="md" p="md">
        <Tabs defaultValue="departments">
          <Tabs.List mb="md">
            <Tabs.Tab value="departments" leftSection={<IconBuilding size={16} />}>{t("settings.departments")}</Tabs.Tab>
            <Tabs.Tab value="positions" leftSection={<IconBriefcase size={16} />}>{t("settings.positions")}</Tabs.Tab>
            <Tabs.Tab value="leaveTypes" leftSection={<IconBeach size={16} />}>{t("settings.leaveTypes")}</Tabs.Tab>
            <Tabs.Tab value="holidays" leftSection={<IconCalendarStar size={16} />}>{t("settings.holidays")}</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="departments"><DepartmentsTab /></Tabs.Panel>
          <Tabs.Panel value="positions"><PositionsTab /></Tabs.Panel>
          <Tabs.Panel value="leaveTypes"><LeaveTypesTab /></Tabs.Panel>
          <Tabs.Panel value="holidays"><HolidaysTab /></Tabs.Panel>
        </Tabs>
      </Paper>
    </Stack>
  );
}

function useCrud<T>(loader: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setItems(await loader()); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  return { items, loading, load };
}

function confirmDelete(t: (k: string) => string, fn: () => Promise<void>, onDone: () => void) {
  modals.openConfirmModal({
    title: t("common.confirm"),
    children: <Text size="sm">{t("settings.deleteConfirm")}</Text>,
    labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
    confirmProps: { color: "red" },
    onConfirm: async () => {
      try { await fn(); notifications.show({ color: "teal", message: t("settings.deleted") }); onDone(); }
      catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    },
  });
}

// ---------------- Departments ----------------
function DepartmentsTab() {
  const { t } = useTranslation();
  const { items, loading, load } = useCrud<Department>(listDepartments);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [opened, h] = useDisclosure(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ initialValues: { name: "", managerId: null as string | null }, validate: { name: (v) => (v.trim() ? null : t("common.name")) } });

  useEffect(() => { listEmployees({ perPage: 500 }).then((r) => setEmployees(r.data)).catch(() => {}); }, []);
  const empName = (id?: number | null) => { const e = employees.find((x) => x.id === id); return e ? `${e.lastName} ${e.firstName}` : "—"; };

  const openNew = () => { setEditing(null); form.setValues({ name: "", managerId: null }); h.open(); };
  const openEdit = (d: Department) => { setEditing(d); form.setValues({ name: d.name, managerId: d.managerId ? String(d.managerId) : null }); h.open(); };
  async function submit(v: typeof form.values) {
    setBusy(true);
    const body = { name: v.name, managerId: v.managerId ? Number(v.managerId) : null };
    try {
      if (editing) await updateDepartment(editing.id, body); else await createDepartment(body);
      notifications.show({ color: "teal", message: t(editing ? "settings.updated" : "settings.created") });
      h.close(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  return (
    <CrudShell loading={loading} onAdd={openNew} addLabel={t("settings.newDepartment")}
      head={<><Table.Th>{t("common.name")}</Table.Th><Table.Th>{t("settings.manager")}</Table.Th><Table.Th /></>}
      empty={items.length === 0}>
      {items.map((d) => (
        <Table.Tr key={d.id}>
          <Table.Td fw={600}>{d.name}</Table.Td>
          <Table.Td>{empName(d.managerId)}</Table.Td>
          <RowActions onEdit={() => openEdit(d)} onDelete={() => confirmDelete(t, () => deleteDepartment(d.id), load)} />
        </Table.Tr>
      ))}
      <Modal opened={opened} onClose={h.close} title={editing ? t("common.edit") : t("settings.newDepartment")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label={t("common.name")} withAsterisk {...form.getInputProps("name")} />
            <Select label={t("settings.manager")} clearable searchable data={employees.map((e) => ({ value: String(e.id), label: `${e.lastName} ${e.firstName}` }))} {...form.getInputProps("managerId")} />
            <Group justify="flex-end"><Button variant="default" onClick={h.close}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("common.save")}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </CrudShell>
  );
}

// ---------------- Positions ----------------
function PositionsTab() {
  const { t } = useTranslation();
  const { items, loading, load } = useCrud<Position>(listPositions);
  const [opened, h] = useDisclosure(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ initialValues: { title: "" }, validate: { title: (v) => (v.trim() ? null : t("common.name")) } });

  const openNew = () => { setEditing(null); form.setValues({ title: "" }); h.open(); };
  const openEdit = (p: Position) => { setEditing(p); form.setValues({ title: p.title }); h.open(); };
  async function submit(v: typeof form.values) {
    setBusy(true);
    try {
      if (editing) await updatePosition(editing.id, v); else await createPosition(v);
      notifications.show({ color: "teal", message: t(editing ? "settings.updated" : "settings.created") });
      h.close(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  return (
    <CrudShell loading={loading} onAdd={openNew} addLabel={t("settings.newPosition")}
      head={<><Table.Th>{t("common.name")}</Table.Th><Table.Th /></>} empty={items.length === 0}>
      {items.map((p) => (
        <Table.Tr key={p.id}>
          <Table.Td fw={600}>{p.title}</Table.Td>
          <RowActions onEdit={() => openEdit(p)} onDelete={() => confirmDelete(t, () => deletePosition(p.id), load)} />
        </Table.Tr>
      ))}
      <Modal opened={opened} onClose={h.close} title={editing ? t("common.edit") : t("settings.newPosition")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label={t("common.name")} withAsterisk {...form.getInputProps("title")} />
            <Group justify="flex-end"><Button variant="default" onClick={h.close}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("common.save")}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </CrudShell>
  );
}

// ---------------- Leave types ----------------
function LeaveTypesTab() {
  const { t } = useTranslation();
  const { items, loading, load } = useCrud<LeaveType>(listLeaveTypes);
  const [opened, h] = useDisclosure(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ initialValues: { name: "", isPaid: true, defaultDays: 0 }, validate: { name: (v) => (v.trim() ? null : t("common.name")) } });

  const openNew = () => { setEditing(null); form.setValues({ name: "", isPaid: true, defaultDays: 0 }); h.open(); };
  const openEdit = (x: LeaveType) => { setEditing(x); form.setValues({ name: x.name, isPaid: x.isPaid, defaultDays: x.defaultDays }); h.open(); };
  async function submit(v: typeof form.values) {
    setBusy(true);
    try {
      if (editing) await updateLeaveType(editing.id, v); else await createLeaveType(v);
      notifications.show({ color: "teal", message: t(editing ? "settings.updated" : "settings.created") });
      h.close(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  return (
    <CrudShell loading={loading} onAdd={openNew} addLabel={t("settings.newLeaveType")}
      head={<><Table.Th>{t("common.name")}</Table.Th><Table.Th>{t("settings.isPaid")}</Table.Th><Table.Th>{t("settings.defaultDays")}</Table.Th><Table.Th /></>}
      empty={items.length === 0}>
      {items.map((x) => (
        <Table.Tr key={x.id}>
          <Table.Td fw={600}>{x.name}</Table.Td>
          <Table.Td>{x.isPaid ? <Badge color="teal" variant="light">{t("settings.paid")}</Badge> : <Badge color="gray" variant="light">{t("leave.unpaid")}</Badge>}</Table.Td>
          <Table.Td>{x.defaultDays}</Table.Td>
          <RowActions onEdit={() => openEdit(x)} onDelete={() => confirmDelete(t, () => deleteLeaveType(x.id), load)} />
        </Table.Tr>
      ))}
      <Modal opened={opened} onClose={h.close} title={editing ? t("common.edit") : t("settings.newLeaveType")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label={t("common.name")} withAsterisk {...form.getInputProps("name")} />
            <Group grow>
              <NumberInput label={t("settings.defaultDays")} min={0} {...form.getInputProps("defaultDays")} />
              <Switch mt={26} label={t("settings.isPaid")} {...form.getInputProps("isPaid", { type: "checkbox" })} />
            </Group>
            <Group justify="flex-end"><Button variant="default" onClick={h.close}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("common.save")}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </CrudShell>
  );
}

// ---------------- Holidays ----------------
function HolidaysTab() {
  const { t } = useTranslation();
  const { items, loading, load } = useCrud<Holiday>(() => listHolidays());
  const [opened, h] = useDisclosure(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    initialValues: { date: null as Date | null, dayType: "holiday", description: "" },
    validate: { date: (v) => (v ? null : t("common.date")) },
  });

  const openNew = () => { setEditing(null); form.setValues({ date: null, dayType: "holiday", description: "" }); h.open(); };
  const openEdit = (x: Holiday) => { setEditing(x); form.setValues({ date: new Date(x.date), dayType: x.dayType, description: x.description ?? "" }); h.open(); };
  async function submit(v: typeof form.values) {
    setBusy(true);
    const body = { date: iso(v.date), dayType: v.dayType, description: v.description };
    try {
      if (editing) await updateHoliday(editing.id, body); else await createHoliday(body);
      notifications.show({ color: "teal", message: t(editing ? "settings.updated" : "settings.created") });
      h.close(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }
  const dayBadge = (dt: string) => <Badge variant="light" color={dt === "holiday" ? "red" : dt === "weekend" ? "gray" : "teal"}>{t(`enums.dayType.${dt}`)}</Badge>;

  return (
    <CrudShell loading={loading} onAdd={openNew} addLabel={t("settings.newHoliday")}
      head={<><Table.Th>{t("common.date")}</Table.Th><Table.Th>{t("settings.dayType")}</Table.Th><Table.Th>{t("settings.description")}</Table.Th><Table.Th /></>}
      empty={items.length === 0}>
      {items.map((x) => (
        <Table.Tr key={x.id}>
          <Table.Td fw={600}>{x.date}</Table.Td>
          <Table.Td>{dayBadge(x.dayType)}</Table.Td>
          <Table.Td>{x.description}</Table.Td>
          <RowActions onEdit={() => openEdit(x)} onDelete={() => confirmDelete(t, () => deleteHoliday(x.id), load)} />
        </Table.Tr>
      ))}
      <Modal opened={opened} onClose={h.close} title={editing ? t("common.edit") : t("settings.newHoliday")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <Group grow>
              <DateInput label={t("common.date")} valueFormat="YYYY-MM-DD" withAsterisk {...form.getInputProps("date")} />
              <Select label={t("settings.dayType")} data={DAY_TYPES.map((d) => ({ value: d, label: t(`enums.dayType.${d}`) }))} {...form.getInputProps("dayType")} />
            </Group>
            <TextInput label={t("settings.description")} {...form.getInputProps("description")} />
            <Group justify="flex-end"><Button variant="default" onClick={h.close}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("common.save")}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </CrudShell>
  );
}

// ---------------- shared shell ----------------
function CrudShell({ loading, onAdd, addLabel, head, children, empty }: {
  loading: boolean; onAdd: () => void; addLabel: string; head: React.ReactNode; children: React.ReactNode; empty: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ position: "relative" }}>
      <LoadingOverlay visible={loading} />
      <Group justify="flex-end" mb="sm">
        <Button size="xs" leftSection={<IconPlus size={15} />} onClick={onAdd}>{addLabel}</Button>
      </Group>
      <Table fz="sm" highlightOnHover>
        <Table.Thead><Table.Tr>{head}</Table.Tr></Table.Thead>
        <Table.Tbody>
          {empty
            ? <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" size="sm" ta="center" py="md">{t("common.noData")}</Text></Table.Td></Table.Tr>
            : children}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Table.Td>
      <Group gap={4} justify="flex-end" wrap="nowrap">
        <ActionIcon variant="subtle" color="gray" onClick={onEdit}><IconPencil size={15} /></ActionIcon>
        <ActionIcon variant="subtle" color="red" onClick={onDelete}><IconTrash size={15} /></ActionIcon>
      </Group>
    </Table.Td>
  );
}
