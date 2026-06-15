import { useEffect, useState } from "react";
import {
  Title, Group, Button, Table, Badge, Paper, Stack, Text, Modal, TextInput,
  NumberInput, MultiSelect, Switch, LoadingOverlay,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import { IconPlus, IconClockHour9 } from "@tabler/icons-react";
import { listShifts, createShift } from "../api/shifts";
import { apiErrorMessage } from "../api/client";
import type { Shift } from "../types";

export default function Shifts() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const weekdayOptions = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: t(`weekday.long.${n}`) }));
  const wdShort = (n: number) => t(`weekday.short.${n}`);

  const form = useForm({
    initialValues: {
      name: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60,
      graceInMinutes: 10, graceOutMinutes: 10, overtimeAfterMin: 540,
      isOvernight: false, weekdays: ["1", "2", "3", "4", "5"] as string[],
    },
    validate: {
      name: (v) => (v.trim() ? null : t("common.name")),
      weekdays: (v) => (v.length ? null : t("shifts.atLeastOneDay")),
    },
  });

  async function load() {
    setLoading(true);
    try { setItems(await listShifts()); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function submit(values: typeof form.values) {
    setSaving(true);
    try {
      await createShift({
        name: values.name, startTime: values.startTime, endTime: values.endTime,
        breakMinutes: values.breakMinutes, graceInMinutes: values.graceInMinutes,
        graceOutMinutes: values.graceOutMinutes, overtimeAfterMin: values.overtimeAfterMin,
        isOvernight: values.isOvernight, weekdays: values.weekdays.map(Number),
      });
      notifications.show({ color: "teal", message: t("shifts.created") });
      close(); form.reset(); await load();
    } catch (err) {
      notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) });
    } finally { setSaving(false); }
  }

  const rows = items.map((s) => (
    <Table.Tr key={s.id}>
      <Table.Td fw={600}>{s.name}</Table.Td>
      <Table.Td>{s.startTime} – {s.endTime}{s.isOvernight && <Badge ml={6} size="xs" color="grape">{t("shifts.overnightBadge")}</Badge>}</Table.Td>
      <Table.Td>{s.breakMinutes} {t("attendance.min")}</Table.Td>
      <Table.Td>{s.graceInMinutes} / {s.graceOutMinutes} {t("attendance.min")}</Table.Td>
      <Table.Td>{s.overtimeAfterMin ? `${s.overtimeAfterMin} ${t("attendance.min")}` : "—"}</Table.Td>
      <Table.Td><Group gap={4}>{s.weekdays.map((w) => <Badge key={w} size="sm" variant="light">{wdShort(w)}</Badge>)}</Group></Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>{t("shifts.title")}</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>{t("shifts.newShift")}</Button>
      </Group>

      <Paper withBorder radius="md" pos="relative">
        <LoadingOverlay visible={loading} zIndex={5} overlayProps={{ radius: "md", blur: 1 }} />
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("shifts.name")}</Table.Th><Table.Th>{t("shifts.time")}</Table.Th>
                <Table.Th>{t("shifts.break")}</Table.Th><Table.Th>{t("shifts.grace")}</Table.Th>
                <Table.Th>{t("shifts.overtime")}</Table.Th><Table.Th>{t("shifts.days")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? rows : (
                <Table.Tr><Table.Td colSpan={6}>
                  <Stack align="center" py="xl" gap={6}>
                    <IconClockHour9 size={34} color="var(--mantine-color-dimmed)" />
                    <Text c="dimmed" size="sm">{t("shifts.noShifts")}</Text>
                  </Stack>
                </Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={opened} onClose={close} title={t("shifts.newShift")} centered size="lg">
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label={t("shifts.name")} placeholder={t("shifts.placeholder")} withAsterisk {...form.getInputProps("name")} />
            <Group grow>
              <TimeInput label={t("shifts.start")} withAsterisk {...form.getInputProps("startTime")} />
              <TimeInput label={t("shifts.end")} withAsterisk {...form.getInputProps("endTime")} />
            </Group>
            <Group grow>
              <NumberInput label={t("shifts.breakMin")} min={0} {...form.getInputProps("breakMinutes")} />
              <NumberInput label={t("shifts.overtimeThreshold")} min={0} {...form.getInputProps("overtimeAfterMin")} />
            </Group>
            <Group grow>
              <NumberInput label={t("shifts.graceIn")} min={0} {...form.getInputProps("graceInMinutes")} />
              <NumberInput label={t("shifts.graceOut")} min={0} {...form.getInputProps("graceOutMinutes")} />
            </Group>
            <MultiSelect label={t("shifts.workDays")} withAsterisk data={weekdayOptions} {...form.getInputProps("weekdays")} />
            <Switch label={t("shifts.overnight")} {...form.getInputProps("isOvernight", { type: "checkbox" })} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={close}>{t("common.cancel")}</Button>
              <Button type="submit" loading={saving}>{t("common.save")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
