import { useEffect, useState } from "react";
import {
  Title, Group, Button, Table, Badge, Paper, LoadingOverlay, Stack, Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconCalendarSearch, IconCalendarOff } from "@tabler/icons-react";
import { apiErrorMessage } from "../api/client";
import { listAttendance } from "../api/attendance";
import { listEmployees } from "../api/employees";
import type { AttendanceRow } from "../types";

const statusColor: Record<string, string> = {
  present: "teal", late: "yellow", absent: "red", on_leave: "blue", sick: "grape", day_off: "gray",
};
function startOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtTime(s: string | null) { return s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"; }
function iso(d: Date | null) { return d ? d.toISOString().slice(0, 10) : ""; }

export default function Attendance() {
  const { t } = useTranslation();
  const [range, setRange] = useState<[Date | null, Date | null]>([startOfMonth(), new Date()]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listEmployees({ perPage: 500 })
      .then((res) => setNames(Object.fromEntries(res.data.map((e) => [e.id, `${e.lastName} ${e.firstName}`]))))
      .catch(() => { /* names are a nice-to-have; ignore */ });
  }, []);

  async function load() {
    if (!range[0] || !range[1]) return;
    setLoading(true);
    try {
      setRows(await listAttendance(iso(range[0]), iso(range[1])));
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    } finally { setLoading(false); }
  }

  const body = rows.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.workDate}</Table.Td>
      <Table.Td>{names[r.employeeId] ?? `#${r.employeeId}`}</Table.Td>
      <Table.Td>{fmtTime(r.checkInAt)}</Table.Td>
      <Table.Td>{fmtTime(r.checkOutAt)}</Table.Td>
      <Table.Td>{(r.workedMinutes / 60).toFixed(1)} {t("attendance.h")}</Table.Td>
      <Table.Td>{r.lateMinutes > 0 ? <Text c="yellow.7">{r.lateMinutes} {t("attendance.min")}</Text> : "—"}</Table.Td>
      <Table.Td>{r.overtimeMinutes > 0 ? <Text c="teal.7">{r.overtimeMinutes} {t("attendance.min")}</Text> : "—"}</Table.Td>
      <Table.Td><Badge variant="light" color={statusColor[r.status] ?? "gray"}>{t(`enums.attendanceStatus.${r.status}`)}</Badge></Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={2}>{t("attendance.title")}</Title>
      <Group>
        <DatePickerInput type="range" label={t("attendance.dateRange")} valueFormat="YYYY-MM-DD" value={range} onChange={setRange} w={300} />
        <Button mt={22} leftSection={<IconCalendarSearch size={18} />} onClick={load}>{t("attendance.show")}</Button>
      </Group>

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("attendance.date")}</Table.Th>
                <Table.Th>{t("attendance.employee")}</Table.Th>
                <Table.Th>{t("attendance.checkIn")}</Table.Th>
                <Table.Th>{t("attendance.checkOut")}</Table.Th>
                <Table.Th>{t("attendance.worked")}</Table.Th>
                <Table.Th>{t("attendance.late")}</Table.Th>
                <Table.Th>{t("attendance.overtime")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {body.length > 0 ? body : (
                <Table.Tr><Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconCalendarOff size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("attendance.noData")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
}
