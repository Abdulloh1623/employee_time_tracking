import { useEffect, useState } from "react";
import {
  Title, Group, Button, Select, Badge, Table, Paper, Stack, Text, SimpleGrid, Card,
  Modal, Drawer, NumberInput, TextInput, LoadingOverlay, ThemeIcon, Divider, Box, Alert, ActionIcon, Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import {
  IconPlus, IconCalculator, IconLock, IconLockOpen, IconReceipt, IconCash, IconCoin, IconUsers,
  IconRuler2, IconFileTypePdf, IconTrash, IconTrashX, IconAlertTriangle, IconPencil,
} from "@tabler/icons-react";
import {
  listPeriods, createPeriod, updatePeriod, calculatePeriod, closePeriod, reopenPeriod, markPeriodPaid,
  deletePeriod, listPayrolls, getPayslip, addAdjustment, updateAdjustment, deleteAdjustment, downloadPayslipPdf,
} from "../api/payroll";
import { listEmployees } from "../api/employees";
import { apiErrorMessage } from "../api/client";
import { formatMoney as money } from "../utils/format";
import PayrollRulesDrawer from "../components/PayrollRulesDrawer";
import SalaryManager from "../components/SalaryManager";
import type { PayrollPeriod, PayrollRow, Payslip, RunSummary, Adjustment, Employee } from "../types";

const ADJ_TYPES = ["bonus", "fine", "deduction", "allowance", "advance"];
const negative = (t: string) => t === "fine" || t === "deduction" || t === "advance";

export default function Payroll() {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newOpen, newHandlers] = useDisclosure(false);
  const [rulesOpen, rulesHandlers] = useDisclosure(false);
  const [salaryOpen, salaryHandlers] = useDisclosure(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null);
  const [slip, setSlip] = useState<Payslip | null>(null);

  const period = periods.find((p) => String(p.id) === periodId) || null;
  const status = period?.status ?? "open";
  const closed = status === "closed" || status === "paid";
  const editable = status === "open" || status === "calculated";

  const periodForm = useForm({
    initialValues: { name: "", startDate: null as Date | null, endDate: null as Date | null },
    validate: {
      name: (v) => (v.trim() ? null : t("payroll.periodName")),
      startDate: (v) => (v ? null : t("common.date")),
      endDate: (v) => (v ? null : t("common.date")),
    },
  });

  async function loadPeriods(selectFirst = false) {
    try {
      const ps = await listPeriods();
      setPeriods(ps);
      if (selectFirst && ps.length) setPeriodId(String(ps[0].id));
      else if (ps.length && !periodId) setPeriodId(String(ps[0].id));
    } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
  }
  async function loadPayrolls(id: string) {
    setLoading(true);
    try { setRows(await listPayrolls(Number(id))); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPeriods(true); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (periodId) { setSummary(null); loadPayrolls(periodId); } /* eslint-disable-next-line */ }, [periodId]);
  useEffect(() => {
    listEmployees({ perPage: 200, status: "active" })
      .then((res) => setEmployees(res.data))
      .catch((err) => notifications.show({ color: "red", message: apiErrorMessage(err) }));
  }, []);

  function openCreatePeriod() { setEditingPeriod(null); periodForm.reset(); newHandlers.open(); }
  function openEditPeriod() {
    if (!period) return;
    setEditingPeriod(period);
    periodForm.setValues({ name: period.name, startDate: new Date(period.startDate), endDate: new Date(period.endDate) });
    newHandlers.open();
  }

  async function onSubmitPeriod(values: typeof periodForm.values) {
    setBusy(true);
    const body = {
      name: values.name,
      startDate: values.startDate!.toISOString().slice(0, 10),
      endDate: values.endDate!.toISOString().slice(0, 10),
    };
    try {
      if (editingPeriod) {
        const p = await updatePeriod(editingPeriod.id, body);
        notifications.show({ color: "teal", message: t("payroll.periodUpdated") });
        newHandlers.close(); periodForm.reset(); setEditingPeriod(null);
        await loadPeriods(); setPeriodId(String(p.id));
      } else {
        const p = await createPeriod(body);
        notifications.show({ color: "teal", message: t("payroll.periodCreated") });
        newHandlers.close(); periodForm.reset();
        await loadPeriods(); setPeriodId(String(p.id));
      }
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  async function onCalculate() {
    if (!periodId) return;
    setBusy(true);
    try {
      const s = await calculatePeriod(Number(periodId));
      setSummary(s); await loadPayrolls(periodId);
      notifications.show({ color: "teal", title: t("payroll.calculated"), message: t("payroll.employeesCalculated", { count: s.employees }) });
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  function onClose() {
    if (!periodId) return;
    modals.openConfirmModal({
      title: t("payroll.closePeriod"),
      children: <Text size="sm">{t("payroll.closeConfirm")}</Text>,
      labels: { confirm: t("payroll.closePeriod"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await closePeriod(Number(periodId));
          notifications.show({ color: "teal", message: t("payroll.periodClosed") });
          await loadPeriods(); await loadPayrolls(periodId);
        } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
      },
    });
  }

  async function openSlip(id: number) {
    try { setSlip(await getPayslip(id)); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
  }

  function periodAction(action: () => Promise<unknown>, confirmKey: string, doneKey: string, color = "red") {
    if (!periodId) return;
    modals.openConfirmModal({
      title: t("payroll.title"),
      children: <Text size="sm">{t(confirmKey)}</Text>,
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color },
      onConfirm: async () => {
        try {
          await action();
          notifications.show({ color: "teal", message: t(doneKey) });
          await loadPeriods();
          if (periodId) await loadPayrolls(periodId);
        } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
      },
    });
  }
  const onReopen = () => periodAction(() => reopenPeriod(Number(periodId)), "payroll.reopenConfirm", "payroll.reopened", "orange");
  const onMarkPaid = () => periodAction(() => markPeriodPaid(Number(periodId)), "payroll.markPaidConfirm", "payroll.markedPaid", "teal");
  function onDeletePeriod() {
    if (!periodId) return;
    modals.openConfirmModal({
      title: t("payroll.deletePeriod"),
      children: <Text size="sm">{t("payroll.deletePeriodConfirm")}</Text>,
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deletePeriod(Number(periodId));
          notifications.show({ color: "teal", message: t("payroll.periodDeleted") });
          setPeriodId(null);
          await loadPeriods(true);
        } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
      },
    });
  }

  const body = rows.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.employeeName}</Table.Td>
      <Table.Td><Badge variant="light" color="gray">{t(`enums.payrollModel.${r.model}`)}</Badge></Table.Td>
      <Table.Td>{r.workedHours}</Table.Td>
      <Table.Td>{money(r.gross, r.currency)}</Table.Td>
      <Table.Td>{r.totalBonus ? <Text c="teal.7">+{money(r.totalBonus, r.currency)}</Text> : "—"}</Table.Td>
      <Table.Td>{r.totalFine ? <Text c="red.6">−{money(r.totalFine, r.currency)}</Text> : "—"}</Table.Td>
      <Table.Td fw={700}>{money(r.net, r.currency)}</Table.Td>
      <Table.Td>
        <Button size="xs" variant="light" leftSection={<IconReceipt size={14} />} onClick={() => openSlip(r.id)}>{t("payroll.payslip")}</Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>{t("payroll.title")}</Title>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconCoin size={18} />} onClick={salaryHandlers.open}>{t("payroll.salaries")}</Button>
          <Button variant="default" leftSection={<IconRuler2 size={18} />} onClick={rulesHandlers.open}>{t("payroll.rules")}</Button>
          <Button leftSection={<IconPlus size={18} />} onClick={openCreatePeriod}>{t("payroll.newPeriod")}</Button>
        </Group>
      </Group>

      <Group align="flex-end">
        <Select label={t("payroll.period")} placeholder={t("payroll.selectPeriod")}
          data={periods.map((p) => ({ value: String(p.id), label: `${p.name} (${p.startDate} → ${p.endDate})` }))}
          value={periodId} onChange={setPeriodId} w={340} />
        {period && (
          <Badge size="lg" mb={6} variant="light"
            color={status === "paid" ? "blue" : status === "closed" ? "red" : status === "calculated" ? "grape" : "teal"}>
            {t(`payroll.${status}`, { defaultValue: status })}
          </Badge>
        )}
        {period && status === "open" && (
          <Tooltip label={t("payroll.editPeriod")}>
            <ActionIcon size="lg" variant="default" mb={6} onClick={openEditPeriod}><IconPencil size={18} /></ActionIcon>
          </Tooltip>
        )}
        <Button leftSection={<IconCalculator size={18} />} disabled={!periodId || !editable} loading={busy} onClick={onCalculate}>{t("payroll.calculate")}</Button>
        {editable && (
          <Button variant="outline" color="red" leftSection={<IconLock size={18} />} disabled={!periodId} onClick={onClose}>{t("payroll.closePeriod")}</Button>
        )}
        {status === "closed" && (
          <Button variant="outline" color="teal" leftSection={<IconCash size={18} />} onClick={onMarkPaid}>{t("payroll.markPaid")}</Button>
        )}
        {closed && (
          <Button variant="outline" color="orange" leftSection={<IconLockOpen size={18} />} onClick={onReopen}>{t("payroll.reopen")}</Button>
        )}
        {status === "open" && rows.length === 0 && (
          <Button variant="subtle" color="red" leftSection={<IconTrash size={18} />} onClick={onDeletePeriod}>{t("payroll.deletePeriod")}</Button>
        )}
      </Group>

      {summary && (
        <>
          <SimpleGrid cols={{ base: 1, xs: 3 }}>
            <SummaryCard icon={IconUsers} color="brand" label={t("payroll.employees")} value={String(summary.employees)} />
            <SummaryCard icon={IconCoin} color="blue" label={t("payroll.totalGross")} value={money(summary.totalGross, summary.currency)} />
            <SummaryCard icon={IconCash} color="teal" label={t("payroll.totalNet")} value={money(summary.totalNet, summary.currency)} />
          </SimpleGrid>
          {summary.unconfigured > 0 && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
              {t("payroll.unconfiguredWarn", { count: summary.unconfigured })}
            </Alert>
          )}
        </>
      )}

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("payroll.employees")}</Table.Th><Table.Th>{t("payroll.model")}</Table.Th><Table.Th>{t("payroll.hours")}</Table.Th>
                <Table.Th>{t("payroll.gross")}</Table.Th><Table.Th>{t("payroll.bonus")}</Table.Th><Table.Th>{t("payroll.fine")}</Table.Th>
                <Table.Th>{t("payroll.net")}</Table.Th><Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {body.length > 0 ? body : (
                <Table.Tr><Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconCalculator size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("payroll.notCalculated")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={newOpen} onClose={() => { newHandlers.close(); setEditingPeriod(null); }}
        title={editingPeriod ? t("payroll.editPeriod") : t("payroll.newPeriodTitle")} centered>
        <form onSubmit={periodForm.onSubmit(onSubmitPeriod)}>
          <Stack>
            <TextInput label={t("payroll.periodName")} placeholder={t("payroll.periodNamePlaceholder")} withAsterisk {...periodForm.getInputProps("name")} />
            <Group grow>
              <DateInput label={t("common.from")} valueFormat="YYYY-MM-DD" withAsterisk {...periodForm.getInputProps("startDate")} />
              <DateInput label={t("common.to")} valueFormat="YYYY-MM-DD" withAsterisk {...periodForm.getInputProps("endDate")} />
            </Group>
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => { newHandlers.close(); setEditingPeriod(null); }}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy}>{t("common.save")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Drawer opened={!!slip} onClose={() => setSlip(null)} position="right" size="lg"
        title={slip ? t("payroll.payslipTitle", { name: slip.payroll.employeeName }) : ""}>
        {slip && <PayslipView slip={slip} editable={editable}
          onChanged={async () => { await openSlip(slip.payroll.id); if (periodId) await loadPayrolls(periodId); }} />}
      </Drawer>

      <PayrollRulesDrawer opened={rulesOpen} onClose={rulesHandlers.close} />

      <Drawer opened={salaryOpen} onClose={salaryHandlers.close} position="right" size="xl" title={t("payroll.salaries")}>
        <SalaryManager employees={employees} />
      </Drawer>
    </Stack>
  );
}

function SummaryCard({ icon: Icon, color, label, value }: { icon: typeof IconUsers; color: string; label: string; value: string }) {
  return (
    <Card withBorder padding="md" radius="md">
      <Group>
        <ThemeIcon size={42} radius="md" variant="light" color={color}><Icon size={22} /></ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text fw={700} fz="lg">{value}</Text>
        </div>
      </Group>
    </Card>
  );
}

function PayslipView({ slip, editable, onChanged }: { slip: Payslip; editable: boolean; onChanged: () => void }) {
  const { t } = useTranslation();
  const p = slip.payroll;
  const form = useForm({
    initialValues: { type: "bonus", amount: 0, reason: "" },
    validate: { amount: (v) => (v > 0 ? null : t("common.amount")), reason: (v) => (v.trim() ? null : t("common.reason")) },
  });
  const editForm = useForm({
    initialValues: { type: "bonus", amount: 0, reason: "" },
    validate: { amount: (v) => (v > 0 ? null : t("common.amount")), reason: (v) => (v.trim() ? null : t("common.reason")) },
  });
  const [busy, setBusy] = useState(false);
  const [editingAdj, setEditingAdj] = useState<Adjustment | null>(null);

  async function add(values: typeof form.values) {
    setBusy(true);
    try {
      await addAdjustment(p.id, { type: values.type, amount: values.amount, reason: values.reason });
      notifications.show({ color: "teal", message: t("payroll.adjAdded") });
      form.reset(); onChanged();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  function openEditAdj(a: Adjustment) {
    setEditingAdj(a);
    editForm.setValues({ type: a.type, amount: a.amount, reason: a.reason });
  }
  async function saveEditAdj(values: typeof editForm.values) {
    if (!editingAdj) return;
    setBusy(true);
    try {
      await updateAdjustment(p.id, editingAdj.id, { type: values.type, amount: values.amount, reason: values.reason });
      notifications.show({ color: "teal", message: t("payroll.adjUpdated") });
      setEditingAdj(null); onChanged();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  function removeAdj(adjId: number) {
    modals.openConfirmModal({
      title: t("payroll.deleteAdj"),
      children: <Text size="sm">{t("payroll.deleteAdjConfirm")}</Text>,
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteAdjustment(p.id, adjId);
          notifications.show({ color: "teal", message: t("payroll.adjDeleted") });
          onChanged();
        } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
      },
    });
  }

  async function downloadPdf() {
    try { await downloadPayslipPdf(p.id, p.employeeName.replace(/\s+/g, "_")); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
  }

  return (
    <Stack>
      <Group justify="flex-end">
        <Button size="xs" variant="light" color="red" leftSection={<IconFileTypePdf size={15} />} onClick={downloadPdf}>
          {t("payroll.downloadPdf")}
        </Button>
      </Group>

      <SimpleGrid cols={2}>
        <Info label={t("payroll.period")} value={slip.period.name} />
        <Info label={t("payroll.model")} value={t(`enums.payrollModel.${p.model}`)} />
        <Info label={t("payroll.workedHours")} value={String(p.workedHours)} />
        <Info label={t("payroll.workedDays")} value={String(p.workedDays)} />
        <Info label={t("payroll.lateMin")} value={String(p.lateMinutes)} c={p.lateMinutes ? "yellow.7" : undefined} />
        <Info label={t("payroll.overtimeMin")} value={String(p.overtimeMinutes)} c={p.overtimeMinutes ? "teal.7" : undefined} />
        <Info label={t("payroll.gross")} value={money(p.gross, p.currency)} />
        <Info label={t("payroll.bonus")} value={money(p.totalBonus, p.currency)} c="teal.7" />
        <Info label={t("payroll.fine")} value={money(p.totalFine, p.currency)} c="red.6" />
        <Info label={t("payroll.deduction")} value={money(p.totalDeduction, p.currency)} c="red.6" />
      </SimpleGrid>
      <Card withBorder radius="md" bg="var(--mantine-color-brand-light)">
        <Group justify="space-between">
          <Text fw={600}>{t("payroll.netPay")}</Text>
          <Text fw={800} fz="xl" c="brand.8">{money(p.net, p.currency)}</Text>
        </Group>
      </Card>

      <Divider label={t("payroll.adjustments")} labelPosition="left" />
      <Table>
        <Table.Thead><Table.Tr><Table.Th>{t("payroll.type")}</Table.Th><Table.Th>{t("common.amount")}</Table.Th><Table.Th>{t("common.reason")}</Table.Th><Table.Th>{t("payroll.source")}</Table.Th><Table.Th /></Table.Tr></Table.Thead>
        <Table.Tbody>
          {slip.adjustments.length === 0 && <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm" ta="center">{t("payroll.noAdjustments")}</Text></Table.Td></Table.Tr>}
          {slip.adjustments.map((a) => (
            <Table.Tr key={a.id}>
              <Table.Td><Badge variant="light" color={negative(a.type) ? "red" : "teal"}>{t(`enums.adjustmentType.${a.type}`)}</Badge></Table.Td>
              <Table.Td>{money(a.amount, p.currency)}</Table.Td>
              <Table.Td>{a.reason}</Table.Td>
              <Table.Td><Text size="xs" c="dimmed">{a.ruleId ? t("common.auto") : t("common.manual")}</Text></Table.Td>
              <Table.Td>
                {editable && !a.ruleId && (
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t("payroll.editAdj")}>
                      <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => openEditAdj(a)}><IconPencil size={15} /></ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("payroll.deleteAdj")}>
                      <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeAdj(a.id)}><IconTrashX size={15} /></ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {editable && (
        <Box>
          <Divider label={t("payroll.addManual")} labelPosition="left" mb="sm" />
          <form onSubmit={form.onSubmit(add)}>
            <Group align="flex-end" grow>
              <Select label={t("payroll.type")} data={ADJ_TYPES.map((x) => ({ value: x, label: t(`enums.adjustmentType.${x}`) }))} {...form.getInputProps("type")} />
              <NumberInput label={t("common.amount")} min={0} thousandSeparator=" " {...form.getInputProps("amount")} />
            </Group>
            <TextInput label={t("common.reason")} mt="xs" {...form.getInputProps("reason")} />
            <Group justify="flex-end" mt="sm">
              <Button type="submit" loading={busy} leftSection={<IconPlus size={16} />}>{t("common.add")}</Button>
            </Group>
          </form>
        </Box>
      )}

      <Modal opened={!!editingAdj} onClose={() => setEditingAdj(null)} title={t("payroll.editAdj")} centered>
        <form onSubmit={editForm.onSubmit(saveEditAdj)}>
          <Stack>
            <Group grow>
              <Select label={t("payroll.type")} data={ADJ_TYPES.map((x) => ({ value: x, label: t(`enums.adjustmentType.${x}`) }))} {...editForm.getInputProps("type")} />
              <NumberInput label={t("common.amount")} min={0} thousandSeparator=" " {...editForm.getInputProps("amount")} />
            </Group>
            <TextInput label={t("common.reason")} {...editForm.getInputProps("reason")} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setEditingAdj(null)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy}>{t("common.save")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

function Info({ label, value, c }: { label: string; value: string; c?: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text fw={600} c={c}>{value}</Text>
    </div>
  );
}
