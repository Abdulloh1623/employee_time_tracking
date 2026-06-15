import { useEffect, useMemo, useState } from "react";
import {
  Stack, Group, Select, Card, Text, Badge, Table, Button, Modal, NumberInput,
  SegmentedControl, Divider, LoadingOverlay, ThemeIcon, Box,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import {
  IconTrendingUp, IconPencil, IconTrash, IconCoin, IconArrowRight, IconCurrencyDollar,
} from "@tabler/icons-react";
import {
  listPayRates, updateCurrentRate, deleteCurrentRate, previewRaise, applyRaise,
} from "../api/shifts";
import { apiErrorMessage } from "../api/client";
import { formatMoney } from "../utils/format";
import { resolveEffective } from "../utils/raise";
import type { Employee, PayRate, RaiseMethod, RaiseEffectiveOption, RaisePreview } from "../types";

const METHODS: RaiseMethod[] = ["percent", "amount", "set"];
const EFF_OPTIONS: RaiseEffectiveOption[] = ["today", "month_start", "next_month", "custom"];

export default function SalaryManager({
  employees,
  initialEmployeeId,
}: {
  employees: Employee[];
  initialEmployeeId?: number;
}) {
  const { t } = useTranslation();
  const [empId, setEmpId] = useState<string | null>(initialEmployeeId ? String(initialEmployeeId) : null);
  const [rates, setRates] = useState<PayRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [raiseOpen, raiseHandlers] = useDisclosure(false);
  const [editOpen, editHandlers] = useDisclosure(false);
  const [preview, setPreview] = useState<RaisePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const current = useMemo(() => rates.find((r) => !r.validTo) ?? null, [rates]);

  const raiseForm = useForm({
    initialValues: {
      method: "percent" as RaiseMethod,
      value: 10 as number,
      effective: "next_month" as RaiseEffectiveOption,
      customDate: new Date() as Date | null,
    },
  });
  const editForm = useForm({
    initialValues: { model: "hourly", hourlyRate: 0, monthlySalary: 0, shiftRate: 0, currency: "UZS" },
  });

  async function load(id: string) {
    setLoading(true);
    try {
      setRates(await listPayRates(Number(id)));
    } catch (err) {
      notifications.show({ color: "red", message: apiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (empId) load(empId);
    else setRates([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  // ---- live raise preview (server is source of truth) ----
  const rv = raiseForm.values;
  const effISO = resolveEffective(rv.effective, rv.customDate);
  useEffect(() => {
    if (!raiseOpen || !empId || !current) {
      setPreview(null);
      return;
    }
    if (!effISO || !Number.isFinite(Number(rv.value))) return;
    let cancelled = false;
    setPreviewing(true);
    const handle = setTimeout(async () => {
      try {
        const p = await previewRaise(Number(empId), {
          method: rv.method,
          value: Number(rv.value),
          effectiveFrom: effISO,
        });
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiseOpen, empId, current?.id, rv.method, rv.value, rv.effective, effISO]);

  function openRaise() {
    raiseForm.reset();
    setPreview(null);
    raiseHandlers.open();
  }
  function openEdit() {
    if (!current) return;
    editForm.setValues({
      model: current.model,
      hourlyRate: current.hourlyRate ?? 0,
      monthlySalary: current.monthlySalary ?? 0,
      shiftRate: current.shiftRate ?? 0,
      currency: current.currency || "UZS",
    });
    editHandlers.open();
  }

  async function submitRaise(values: typeof raiseForm.values) {
    if (!empId) return;
    const iso = resolveEffective(values.effective, values.customDate);
    if (!iso) {
      notifications.show({ color: "red", message: t("common.date") });
      return;
    }
    setBusy(true);
    try {
      await applyRaise(Number(empId), { method: values.method, value: Number(values.value), effectiveFrom: iso });
      notifications.show({ color: "teal", message: t("salary.raised") });
      raiseHandlers.close();
      await load(empId);
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(values: typeof editForm.values) {
    if (!empId) return;
    setBusy(true);
    try {
      await updateCurrentRate(Number(empId), {
        model: values.model,
        hourlyRate: values.model === "hourly" || values.model === "mixed" ? values.hourlyRate : null,
        monthlySalary: values.model === "fixed_monthly" || values.model === "mixed" ? values.monthlySalary : null,
        shiftRate: values.model === "per_shift" ? values.shiftRate : null,
        currency: values.currency,
      });
      notifications.show({ color: "teal", message: t("salary.rateUpdated") });
      editHandlers.close();
      await load(empId);
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  function confirmUndo() {
    if (!empId) return;
    modals.openConfirmModal({
      title: t("salary.undoRaise"),
      children: <Text size="sm">{t("salary.undoRaiseConfirm")}</Text>,
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteCurrentRate(Number(empId));
          notifications.show({ color: "teal", message: t("salary.rateDeleted") });
          await load(empId);
        } catch (err) {
          notifications.show({ color: "red", message: apiErrorMessage(err) });
        }
      },
    });
  }

  const rateValue = (r: PayRate) => {
    if (r.hourlyRate) return `${formatMoney(r.hourlyRate, r.currency)}${t("assignment.perHour")}`;
    if (r.monthlySalary) return `${formatMoney(r.monthlySalary, r.currency)}${t("assignment.perMonth")}`;
    if (r.shiftRate) return `${formatMoney(r.shiftRate, r.currency)}${t("assignment.perShift")}`;
    return "—";
  };

  const editModel = editForm.values.model;
  const modelData = ["hourly", "fixed_monthly", "per_shift", "mixed"].map((m) => ({
    value: m,
    label: t(`enums.payrollModel.${m}`),
  }));

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />

      <Select
        label={t("salary.employee")}
        placeholder={t("salary.selectEmployee")}
        searchable
        nothingFoundMessage={t("salary.noEmployees")}
        data={employees.map((e) => ({ value: String(e.id), label: `${e.lastName} ${e.firstName}` }))}
        value={empId}
        onChange={setEmpId}
        w={360}
      />

      {empId && (
        <Card withBorder radius="md">
          <Group justify="space-between" align="center">
            <Group>
              <ThemeIcon size={42} radius="md" variant="light" color="teal">
                <IconCurrencyDollar size={22} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {t("salary.currentRate")}
                </Text>
                {current ? (
                  <Group gap={8} mt={2}>
                    <Text fw={700} fz="lg">{rateValue(current)}</Text>
                    <Badge variant="light" color="gray">{t(`enums.payrollModel.${current.model}`)}</Badge>
                    <Text size="xs" c="dimmed">{t("common.from")} {current.validFrom}</Text>
                  </Group>
                ) : (
                  <Text c="dimmed" size="sm" mt={2}>{t("salary.noRateHint")}</Text>
                )}
              </div>
            </Group>
            <Group gap="xs">
              <Button leftSection={<IconTrendingUp size={16} />} disabled={!current} onClick={openRaise}>
                {t("salary.raise")}
              </Button>
              <Button variant="default" leftSection={<IconPencil size={16} />} disabled={!current} onClick={openEdit}>
                {t("common.edit")}
              </Button>
              <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} disabled={!current} onClick={confirmUndo}>
                {t("salary.undoRaise")}
              </Button>
            </Group>
          </Group>
        </Card>
      )}

      {empId && (
        <div>
          <Divider label={t("salary.history")} labelPosition="left" mb="xs" />
          <Table fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("assignment.model")}</Table.Th>
                <Table.Th>{t("common.value")}</Table.Th>
                <Table.Th>{t("common.from")}</Table.Th>
                <Table.Th>{t("common.to")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rates.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" size="sm" ta="center" py="md">{t("assignment.noRate")}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {rates.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <Badge variant="light" color="gray">{t(`enums.payrollModel.${r.model}`)}</Badge>
                    {!r.validTo && <Badge ml={6} size="xs" color="teal">{t("assignment.current")}</Badge>}
                  </Table.Td>
                  <Table.Td>{rateValue(r)}</Table.Td>
                  <Table.Td>{r.validFrom}</Table.Td>
                  <Table.Td>{r.validTo ?? "—"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {/* ---- Raise modal ---- */}
      <Modal opened={raiseOpen} onClose={raiseHandlers.close} title={t("salary.raiseTitle")} centered>
        <form onSubmit={raiseForm.onSubmit(submitRaise)}>
          <Stack>
            <Group grow>
              <Select
                label={t("salary.method")}
                data={METHODS.map((m) => ({ value: m, label: t(`salary.method_${m}`) }))}
                {...raiseForm.getInputProps("method")}
              />
              <NumberInput
                label={t("salary.value")}
                min={0}
                thousandSeparator=" "
                suffix={raiseForm.values.method === "percent" ? " %" : undefined}
                {...raiseForm.getInputProps("value")}
              />
            </Group>

            <div>
              <Text size="sm" fw={500} mb={4}>{t("salary.effectiveFrom")}</Text>
              <SegmentedControl
                fullWidth
                size="xs"
                data={EFF_OPTIONS.map((o) => ({ value: o, label: t(`salary.eff_${o}`) }))}
                {...raiseForm.getInputProps("effective")}
              />
            </div>
            {raiseForm.values.effective === "custom" && (
              <DateInput label={t("salary.eff_custom")} valueFormat="YYYY-MM-DD" {...raiseForm.getInputProps("customDate")} />
            )}

            <Card withBorder radius="md" bg="var(--mantine-color-brand-light)" pos="relative">
              <LoadingOverlay visible={previewing} zIndex={5} />
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={6}>{t("salary.preview")}</Text>
              {preview ? (
                <Group justify="space-between" align="center">
                  <Box>
                    <Text size="xs" c="dimmed">{t("salary.currentValue")}</Text>
                    <Text fw={600}>{formatMoney(preview.currentValue, preview.currency)}</Text>
                  </Box>
                  <ThemeIcon variant="light" color="teal" radius="xl"><IconArrowRight size={16} /></ThemeIcon>
                  <Box ta="right">
                    <Text size="xs" c="dimmed">{t("salary.newValue")}</Text>
                    <Text fw={800} c="brand.8" fz="lg">{formatMoney(preview.newValue, preview.currency)}</Text>
                  </Box>
                </Group>
              ) : (
                <Text c="dimmed" size="sm">{previewing ? t("common.loading") : "—"}</Text>
              )}
              <Text size="xs" c="dimmed" mt={6}>{t("salary.effectiveFrom")}: {effISO || "—"}</Text>
            </Card>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={raiseHandlers.close}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy} leftSection={<IconCoin size={16} />} disabled={!preview}>
                {t("salary.raise")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ---- Edit current rate modal ---- */}
      <Modal opened={editOpen} onClose={editHandlers.close} title={t("salary.editRate")} centered>
        <form onSubmit={editForm.onSubmit(submitEdit)}>
          <Stack>
            <Select label={t("assignment.model")} data={modelData} {...editForm.getInputProps("model")} />
            <Group grow>
              {(editModel === "hourly" || editModel === "mixed") && (
                <NumberInput label={t("assignment.hourlyRate")} min={0} thousandSeparator=" " {...editForm.getInputProps("hourlyRate")} />
              )}
              {(editModel === "fixed_monthly" || editModel === "mixed") && (
                <NumberInput label={t("assignment.monthlySalary")} min={0} thousandSeparator=" " {...editForm.getInputProps("monthlySalary")} />
              )}
              {editModel === "per_shift" && (
                <NumberInput label={t("assignment.shiftRate")} min={0} thousandSeparator=" " {...editForm.getInputProps("shiftRate")} />
              )}
              <Select label={t("common.currency")} w={110} data={["UZS", "USD"]} {...editForm.getInputProps("currency")} />
            </Group>
            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={editHandlers.close}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy}>{t("common.save")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
