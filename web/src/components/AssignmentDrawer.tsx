import { useEffect, useState } from "react";
import {
  Drawer, Title, Select, Button, Group, Table, Badge, Divider, NumberInput, Text, LoadingOverlay,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconCalendarPlus, IconCoin } from "@tabler/icons-react";
import { listShifts, listEmployeeShifts, assignShift, listPayRates, setPayRate } from "../api/shifts";
import { apiErrorMessage } from "../api/client";
import { formatMoney } from "../utils/format";
import type { Employee, Shift, EmployeeShift, PayRate } from "../types";

export default function AssignmentDrawer({ emp, onClose }: { emp: Employee | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assigns, setAssigns] = useState<EmployeeShift[]>([]);
  const [rates, setRates] = useState<PayRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyShift, setBusyShift] = useState(false);
  const [busyRate, setBusyRate] = useState(false);

  const shiftForm = useForm({
    initialValues: { shiftId: "", validFrom: new Date() as Date | null },
    validate: { shiftId: (v) => (v ? null : t("assignment.shift")), validFrom: (v) => (v ? null : t("common.date")) },
  });
  const rateForm = useForm({
    initialValues: { model: "hourly", hourlyRate: 0, monthlySalary: 0, shiftRate: 0, currency: "UZS", validFrom: new Date() as Date | null },
    validate: { validFrom: (v) => (v ? null : t("common.date")) },
  });

  async function load(id: number) {
    setLoading(true);
    try {
      const [s, a, r] = await Promise.all([listShifts(), listEmployeeShifts(id), listPayRates(id)]);
      setShifts(s); setAssigns(a); setRates(r);
    } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (emp) load(emp.id); /* eslint-disable-next-line */ }, [emp?.id]);

  async function onAssign(values: typeof shiftForm.values) {
    if (!emp) return;
    setBusyShift(true);
    try {
      await assignShift(emp.id, { shiftId: Number(values.shiftId), validFrom: iso(values.validFrom) });
      notifications.show({ color: "teal", message: t("assignment.assigned") });
      shiftForm.reset(); await load(emp.id);
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusyShift(false); }
  }

  async function onSetRate(values: typeof rateForm.values) {
    if (!emp) return;
    setBusyRate(true);
    try {
      await setPayRate(emp.id, {
        model: values.model,
        hourlyRate: values.model === "hourly" || values.model === "mixed" ? values.hourlyRate : null,
        monthlySalary: values.model === "fixed_monthly" || values.model === "mixed" ? values.monthlySalary : null,
        shiftRate: values.model === "per_shift" ? values.shiftRate : null,
        currency: values.currency, validFrom: iso(values.validFrom),
      });
      notifications.show({ color: "teal", message: t("assignment.rateAdded") });
      await load(emp.id);
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusyRate(false); }
  }

  const model = rateForm.values.model;
  const modelData = ["hourly", "fixed_monthly", "per_shift", "mixed"].map((m) => ({ value: m, label: t(`enums.payrollModel.${m}`) }));
  const rateValue = (r: PayRate) => {
    if (r.hourlyRate) return `${formatMoney(r.hourlyRate, r.currency)}${t("assignment.perHour")}`;
    if (r.monthlySalary) return `${formatMoney(r.monthlySalary, r.currency)}${t("assignment.perMonth")}`;
    if (r.shiftRate) return `${formatMoney(r.shiftRate, r.currency)}${t("assignment.perShift")}`;
    return "—";
  };

  return (
    <Drawer opened={!!emp} onClose={onClose} position="right" size="lg"
      title={emp ? t("assignment.title", { name: `${emp.lastName} ${emp.firstName}` }) : ""}>
      <div style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />

        <Title order={5} mb="xs">{t("assignment.assignShiftSection")}</Title>
        <form onSubmit={shiftForm.onSubmit(onAssign)}>
          <Group align="flex-end" grow>
            <Select label={t("assignment.shift")} data={shifts.map((s) => ({ value: String(s.id), label: `${s.name} (${s.startTime}–${s.endTime})` }))} {...shiftForm.getInputProps("shiftId")} />
            <DateInput label={t("assignment.validFrom")} valueFormat="YYYY-MM-DD" {...shiftForm.getInputProps("validFrom")} />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button type="submit" size="xs" loading={busyShift} leftSection={<IconCalendarPlus size={15} />}>{t("assignment.assign")}</Button>
          </Group>
        </form>
        <Table mt="xs" fz="sm">
          <Table.Thead><Table.Tr><Table.Th>{t("assignment.shift")}</Table.Th><Table.Th>{t("common.from")}</Table.Th><Table.Th>{t("common.to")}</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {assigns.length === 0 && <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" size="sm" ta="center">{t("assignment.notAssigned")}</Text></Table.Td></Table.Tr>}
            {assigns.map((a, i) => (
              <Table.Tr key={a.id}>
                <Table.Td>{a.shiftName}{i === 0 && !a.validTo && <Badge ml={6} size="xs" color="teal">{t("assignment.current")}</Badge>}</Table.Td>
                <Table.Td>{a.validFrom}</Table.Td><Table.Td>{a.validTo ?? "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Divider my="lg" />

        <Title order={5} mb="xs">{t("assignment.rateSection")}</Title>
        <form onSubmit={rateForm.onSubmit(onSetRate)}>
          <Group grow>
            <Select label={t("assignment.model")} data={modelData} {...rateForm.getInputProps("model")} />
            <DateInput label={t("assignment.validFrom")} valueFormat="YYYY-MM-DD" {...rateForm.getInputProps("validFrom")} />
          </Group>
          <Group grow mt="xs">
            {(model === "hourly" || model === "mixed") && <NumberInput label={t("assignment.hourlyRate")} min={0} thousandSeparator=" " {...rateForm.getInputProps("hourlyRate")} />}
            {(model === "fixed_monthly" || model === "mixed") && <NumberInput label={t("assignment.monthlySalary")} min={0} thousandSeparator=" " {...rateForm.getInputProps("monthlySalary")} />}
            {model === "per_shift" && <NumberInput label={t("assignment.shiftRate")} min={0} thousandSeparator=" " {...rateForm.getInputProps("shiftRate")} />}
            <Select label={t("common.currency")} w={110} data={["UZS", "USD"]} {...rateForm.getInputProps("currency")} />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button type="submit" size="xs" loading={busyRate} leftSection={<IconCoin size={15} />}>{t("assignment.setRate")}</Button>
          </Group>
        </form>
        <Table mt="xs" fz="sm">
          <Table.Thead><Table.Tr><Table.Th>{t("assignment.model")}</Table.Th><Table.Th>{t("common.value")}</Table.Th><Table.Th>{t("common.from")}</Table.Th><Table.Th>{t("common.to")}</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {rates.length === 0 && <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm" ta="center">{t("assignment.noRate")}</Text></Table.Td></Table.Tr>}
            {rates.map((r, i) => (
              <Table.Tr key={r.id}>
                <Table.Td><Badge variant="light" color="gray">{t(`enums.payrollModel.${r.model}`)}</Badge>{i === 0 && !r.validTo && <Badge ml={6} size="xs" color="teal">{t("assignment.current")}</Badge>}</Table.Td>
                <Table.Td>{rateValue(r)}</Table.Td><Table.Td>{r.validFrom}</Table.Td><Table.Td>{r.validTo ?? "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Drawer>
  );
}

function iso(d: Date | null) { return d ? d.toISOString().slice(0, 10) : ""; }
