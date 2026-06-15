import { useEffect, useState } from "react";
import {
  Title, Group, Button, Select, Table, Badge, Paper, Stack, Text, Modal, Textarea,
  LoadingOverlay, ActionIcon, Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconPlus, IconCheck, IconX, IconBeach } from "@tabler/icons-react";
import { listLeaveTypes, listLeaveRequests, createLeaveRequest, decideLeave } from "../api/leave";
import { listEmployees } from "../api/employees";
import { apiErrorMessage } from "../api/client";
import type { LeaveType, LeaveRequest, Employee } from "../types";

const statusColor: Record<string, string> = { pending: "yellow", approved: "teal", rejected: "red", cancelled: "gray" };
function iso(d: Date | null) { return d ? d.toISOString().slice(0, 10) : ""; }

// Translate known seeded leave-type names; fall back to the raw name
function typeLabel(name: string, t: (k: string) => string) {
  const known = ["Annual", "Sick", "Unpaid"];
  return known.includes(name) ? t(`enums.leaveType.${name}`) : name;
}

export default function Leave() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>("");
  const [loading, setLoading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [busy, setBusy] = useState(false);

  const form = useForm({
    initialValues: { employeeId: "", leaveTypeId: "", range: [null, null] as [Date | null, Date | null], reason: "" },
    validate: {
      employeeId: (v) => (v ? null : t("leave.employee")),
      leaveTypeId: (v) => (v ? null : t("leave.leaveType")),
      range: (v) => (v[0] && v[1] ? null : t("leave.dateRange")),
    },
  });

  async function load() {
    setLoading(true);
    try { setRequests(await listLeaveRequests({ status: statusFilter || undefined })); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    listLeaveTypes().then(setTypes).catch(() => {});
    listEmployees({ page: 1, perPage: 100 }).then((r) => setEmployees(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function submit(values: typeof form.values) {
    setBusy(true);
    try {
      await createLeaveRequest({
        employeeId: Number(values.employeeId), leaveTypeId: Number(values.leaveTypeId),
        dateFrom: iso(values.range[0]), dateTo: iso(values.range[1]), reason: values.reason || undefined,
      });
      notifications.show({ color: "teal", message: t("leave.submitted") });
      close(); form.reset(); await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  async function decide(id: number, decision: "approved" | "rejected") {
    try {
      await decideLeave(id, decision);
      notifications.show({ color: decision === "approved" ? "teal" : "red", message: decision === "approved" ? t("leave.approvedMsg") : t("leave.rejectedMsg") });
      await load();
    } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
  }

  const body = requests.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.employeeName}</Table.Td>
      <Table.Td>{typeLabel(r.leaveTypeName, t)}</Table.Td>
      <Table.Td>{r.dateFrom} → {r.dateTo}</Table.Td>
      <Table.Td>{r.days}</Table.Td>
      <Table.Td>{r.reason || "—"}</Table.Td>
      <Table.Td><Badge variant="light" color={statusColor[r.status] ?? "gray"}>{t(`enums.leaveStatus.${r.status}`)}</Badge></Table.Td>
      <Table.Td>
        {r.status === "pending" && (
          <Group gap={6}>
            <Tooltip label={t("leave.approve")}><ActionIcon color="teal" variant="light" onClick={() => decide(r.id, "approved")}><IconCheck size={16} /></ActionIcon></Tooltip>
            <Tooltip label={t("leave.reject")}><ActionIcon color="red" variant="light" onClick={() => decide(r.id, "rejected")}><IconX size={16} /></ActionIcon></Tooltip>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>{t("leave.title")}</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>{t("leave.newRequest")}</Button>
      </Group>

      <Select label={t("common.status")} w={200}
        data={[{ value: "", label: t("common.all") },
          { value: "pending", label: t("enums.leaveStatus.pending") },
          { value: "approved", label: t("enums.leaveStatus.approved") },
          { value: "rejected", label: t("enums.leaveStatus.rejected") }]}
        value={statusFilter} onChange={setStatusFilter} />

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("leave.employee")}</Table.Th><Table.Th>{t("leave.leaveType")}</Table.Th>
                <Table.Th>{t("leave.period")}</Table.Th><Table.Th>{t("leave.days")}</Table.Th>
                <Table.Th>{t("leave.reason")}</Table.Th><Table.Th>{t("common.status")}</Table.Th><Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {body.length > 0 ? body : (
                <Table.Tr><Table.Td colSpan={7}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconBeach size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("leave.noRequests")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={opened} onClose={close} title={t("leave.newRequestTitle")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <Select label={t("leave.employee")} withAsterisk searchable
              data={employees.map((e) => ({ value: String(e.id), label: `${e.lastName} ${e.firstName}` }))}
              {...form.getInputProps("employeeId")} />
            <Select label={t("leave.leaveType")} withAsterisk
              data={types.map((ty) => ({ value: String(ty.id), label: ty.isPaid ? typeLabel(ty.name, t) : `${typeLabel(ty.name, t)} (${t("leave.unpaid")})` }))}
              {...form.getInputProps("leaveTypeId")} />
            <DatePickerInput type="range" label={t("leave.dateRange")} valueFormat="YYYY-MM-DD" withAsterisk {...form.getInputProps("range")} />
            <Textarea label={t("leave.reason")} autosize minRows={2} {...form.getInputProps("reason")} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={close}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy}>{t("leave.submit")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
