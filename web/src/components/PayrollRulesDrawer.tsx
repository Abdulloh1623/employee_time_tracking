import { useEffect, useState } from "react";
import {
  Drawer, Stack, Group, Button, Table, Badge, Text, Modal, TextInput, Select,
  NumberInput, Switch, ActionIcon, Divider, LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import { IconPlus, IconPencil, IconTrash, IconRuler2 } from "@tabler/icons-react";
import { listRules, createRule, updateRule, deleteRule } from "../api/payroll";
import { apiErrorMessage } from "../api/client";
import type { PayrollRule } from "../types";

const TRIGGERS = ["zero_lateness", "per_late_minute", "early_leave", "absence", "holiday", "night", "kpi", "income_tax"];
const RULE_TYPES = ["bonus", "fine", "deduction"];
const AMOUNT_TYPES = ["fixed", "percent", "per_minute"];

export default function PayrollRulesDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, formHandlers] = useDisclosure(false);
  const [editing, setEditing] = useState<PayrollRule | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm({
    initialValues: {
      name: "", type: "bonus", trigger: "zero_lateness", amountType: "fixed",
      amountValue: 0, isActive: true,
    },
    validate: { name: (v) => (v.trim() ? null : t("payroll.ruleName")) },
  });

  async function load() {
    setLoading(true);
    try { setRules(await listRules()); }
    catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (opened) load(); }, [opened]);

  function openCreate() { setEditing(null); form.setValues({ name: "", type: "bonus", trigger: "zero_lateness", amountType: "fixed", amountValue: 0, isActive: true }); formHandlers.open(); }
  function openEdit(r: PayrollRule) {
    setEditing(r);
    form.setValues({ name: r.name, type: r.type, trigger: r.trigger, amountType: r.amountType, amountValue: r.amountValue, isActive: r.isActive });
    formHandlers.open();
  }

  async function submit(values: typeof form.values) {
    setBusy(true);
    try {
      if (editing) { await updateRule(editing.id, values); notifications.show({ color: "teal", message: t("payroll.ruleUpdated") }); }
      else { await createRule(values); notifications.show({ color: "teal", message: t("payroll.ruleCreated") }); }
      formHandlers.close();
      await load();
    } catch (err) { notifications.show({ color: "red", title: t("common.error"), message: apiErrorMessage(err) }); }
    finally { setBusy(false); }
  }

  function confirmDelete(r: PayrollRule) {
    modals.openConfirmModal({
      title: t("payroll.manageRules"),
      children: <Text size="sm">{t("payroll.deleteRuleConfirm")}</Text>,
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try { await deleteRule(r.id); notifications.show({ color: "teal", message: t("payroll.ruleDeleted") }); load(); }
        catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
      },
    });
  }

  async function toggleActive(r: PayrollRule) {
    try {
      await updateRule(r.id, { ...r, isActive: !r.isActive });
      load();
    } catch (err) { notifications.show({ color: "red", message: apiErrorMessage(err) }); }
  }

  const rows = rules.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td fw={600}>{r.name}</Table.Td>
      <Table.Td><Badge variant="light" color={r.type === "bonus" ? "teal" : "red"}>{t(`enums.ruleType.${r.type}`)}</Badge></Table.Td>
      <Table.Td>{t(`enums.ruleTrigger.${r.trigger}`)}</Table.Td>
      <Table.Td>{t(`enums.amountType.${r.amountType}`)}: {r.amountValue}</Table.Td>
      <Table.Td><Switch size="sm" checked={r.isActive} onChange={() => toggleActive(r)} /></Table.Td>
      <Table.Td>
        <Group gap={4}>
          <ActionIcon variant="subtle" color="gray" onClick={() => openEdit(r)}><IconPencil size={15} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => confirmDelete(r)}><IconTrash size={15} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="lg" title={t("payroll.manageRules")}>
      <Group justify="flex-end" mb="sm">
        <Button size="xs" leftSection={<IconPlus size={15} />} onClick={openCreate}>{t("payroll.newRule")}</Button>
      </Group>
      <div style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />
        <Table fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("payroll.ruleName")}</Table.Th><Table.Th>{t("payroll.ruleType")}</Table.Th>
              <Table.Th>{t("payroll.trigger")}</Table.Th><Table.Th>{t("payroll.amountValue")}</Table.Th>
              <Table.Th>{t("payroll.active")}</Table.Th><Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : (
              <Table.Tr><Table.Td colSpan={6}>
                <Stack align="center" py="lg" gap={6}>
                  <IconRuler2 size={28} color="var(--mantine-color-dimmed)" />
                  <Text c="dimmed" size="sm">{t("payroll.noRules")}</Text>
                </Stack>
              </Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </div>

      <Modal opened={formOpen} onClose={formHandlers.close} title={editing ? t("payroll.editRule") : t("payroll.newRule")} centered>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput label={t("payroll.ruleName")} withAsterisk {...form.getInputProps("name")} />
            <Group grow>
              <Select label={t("payroll.ruleType")} data={RULE_TYPES.map((x) => ({ value: x, label: t(`enums.ruleType.${x}`) }))} {...form.getInputProps("type")} />
              <Select label={t("payroll.trigger")} data={TRIGGERS.map((x) => ({ value: x, label: t(`enums.ruleTrigger.${x}`) }))} {...form.getInputProps("trigger")} />
            </Group>
            <Group grow>
              <Select label={t("payroll.amountType")} data={AMOUNT_TYPES.map((x) => ({ value: x, label: t(`enums.amountType.${x}`) }))} {...form.getInputProps("amountType")} />
              <NumberInput label={t("payroll.amountValue")} min={0} thousandSeparator=" " {...form.getInputProps("amountValue")} />
            </Group>
            <Switch label={t("payroll.active")} {...form.getInputProps("isActive", { type: "checkbox" })} />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={formHandlers.close}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy}>{t("common.save")}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Drawer>
  );
}
