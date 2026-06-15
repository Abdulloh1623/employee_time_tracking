import { useEffect, useState } from "react";
import {
  Title, Group, Button, Select, Table, Paper, Stack, Text, LoadingOverlay, Divider,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconFileSpreadsheet, IconFileTypePdf, IconSearch, IconReportAnalytics } from "@tabler/icons-react";
import {
  attendanceReport, downloadAttendanceReport, downloadPayrollReport, type AttendanceReportRow,
} from "../api/reports";
import { listDepartments } from "../api/employees";
import { listPeriods } from "../api/payroll";
import { apiErrorMessage } from "../api/client";
import type { Department, PayrollPeriod } from "../types";

function startOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
function iso(d: Date | null) { return d ? d.toISOString().slice(0, 10) : ""; }

export default function Reports() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [range, setRange] = useState<[Date | null, Date | null]>([startOfMonth(), new Date()]);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => {});
    listPeriods().then((ps) => { setPeriods(ps); if (ps.length) setPeriodId(String(ps[0].id)); }).catch(() => {});
  }, []);

  const attParams = () => ({ dateFrom: iso(range[0]), dateTo: iso(range[1]), departmentId: deptId ? Number(deptId) : undefined });

  async function loadAttendance() {
    setLoading(true);
    try { setRows(await attendanceReport(attParams())); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  async function dl(fn: () => Promise<void>, what: string) {
    try { await fn(); notifications.show({ color: "teal", message: t("reports.downloaded", { what }) }); }
    catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
  }

  const body = rows.map((r) => (
    <Table.Tr key={r.employeeId}>
      <Table.Td>{r.employeeName}</Table.Td><Table.Td>{r.department}</Table.Td>
      <Table.Td>{r.presentDays}</Table.Td><Table.Td>{r.lateDays}</Table.Td>
      <Table.Td>{r.totalLateMinutes}</Table.Td><Table.Td>{r.totalWorkedHours}</Table.Td>
      <Table.Td>{r.totalOvertimeHours}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={2}>{t("reports.title")}</Title>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">{t("reports.attendanceReport")}</Text>
        <Group align="flex-end">
          <DatePickerInput type="range" label={t("reports.dateRange")} valueFormat="YYYY-MM-DD" value={range} onChange={setRange} w={280} />
          <Select label={t("reports.department")} clearable placeholder={t("common.all")} w={180}
            data={departments.map((d) => ({ value: String(d.id), label: d.name }))} value={deptId} onChange={setDeptId} />
          <Button leftSection={<IconSearch size={16} />} onClick={loadAttendance}>{t("reports.show")}</Button>
          <Button variant="light" color="green" leftSection={<IconFileSpreadsheet size={16} />}
            onClick={() => dl(() => downloadAttendanceReport(attParams(), "xlsx"), t("reports.excel"))}>{t("reports.excel")}</Button>
          <Button variant="light" color="red" leftSection={<IconFileTypePdf size={16} />}
            onClick={() => dl(() => downloadAttendanceReport(attParams(), "pdf"), t("reports.pdf"))}>{t("reports.pdf")}</Button>
        </Group>

        <Paper withBorder radius="md" mt="md" pos="relative">
          <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("reports.employee")}</Table.Th><Table.Th>{t("reports.department")}</Table.Th>
                  <Table.Th>{t("reports.presentDays")}</Table.Th><Table.Th>{t("reports.lateDays")}</Table.Th>
                  <Table.Th>{t("reports.lateMin")}</Table.Th><Table.Th>{t("reports.workedHours")}</Table.Th>
                  <Table.Th>{t("reports.overtime")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {body.length > 0 ? body : (
                  <Table.Tr><Table.Td colSpan={7}>
                    <Stack align="center" py="lg" gap={6}>
                      <IconReportAnalytics size={30} color="var(--mantine-color-dimmed)" />
                      <Text c="dimmed" size="sm">{t("reports.clickShow")}</Text>
                    </Stack>
                  </Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">{t("reports.payrollReport")}</Text>
        <Group align="flex-end">
          <Select label={t("payroll.period")} w={220} placeholder={t("reports.selectPeriod")}
            data={periods.map((p) => ({ value: String(p.id), label: p.name }))} value={periodId} onChange={setPeriodId} />
          <Button variant="light" color="green" disabled={!periodId} leftSection={<IconFileSpreadsheet size={16} />}
            onClick={() => dl(() => downloadPayrollReport(Number(periodId), "xlsx"), t("reports.excel"))}>{t("reports.excel")}</Button>
          <Button variant="light" color="red" disabled={!periodId} leftSection={<IconFileTypePdf size={16} />}
            onClick={() => dl(() => downloadPayrollReport(Number(periodId), "pdf"), t("reports.pdf"))}>{t("reports.pdf")}</Button>
        </Group>
        <Divider my="sm" />
        <Text size="sm" c="dimmed">{t("reports.payrollHint")}</Text>
      </Paper>
    </Stack>
  );
}
