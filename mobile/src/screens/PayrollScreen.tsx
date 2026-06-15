import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, Modal, ActivityIndicator,
  ScrollView, RefreshControl, StyleSheet, Switch, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  listPeriods, createPeriod, calculatePeriod, closePeriod, reopenPeriod,
  markPeriodPaid, deletePeriod, listPayrolls, getPayslip, addAdjustment,
  deleteAdjustment, listRules, createRule, updateRule, deleteRule,
} from "../api/payroll";
import { apiErrorMessage } from "../api/client";
import { formatMoney } from "../format";
import { useTheme, type Colors } from "../theme";
import type {
  PayrollPeriod, PayrollRow, Payslip, PayrollRule, Adjustment,
} from "../types";

type PeriodStatus = PayrollPeriod["status"];

function periodStatusColor(c: Colors): Record<PeriodStatus, string> {
  return {
    open: c.green,
    calculated: c.grape,
    closed: c.red,
    paid: c.brand,
  };
}

const periodStatusLabelKey: Record<PeriodStatus, string> = {
  open: "payroll.statusOpen",
  calculated: "payroll.statusCalculated",
  closed: "payroll.statusClosed",
  paid: "payroll.statusPaid",
};

const RULE_TYPES = ["bonus", "fine", "deduction"] as const;
const RULE_TRIGGERS = [
  "zero_lateness", "per_late_minute", "early_leave", "absence",
  "holiday", "night", "kpi", "income_tax",
] as const;
const RULE_AMOUNT_TYPES = ["fixed", "percent", "per_minute"] as const;
const ADJ_TYPES = ["bonus", "fine", "deduction", "allowance", "advance"] as const;

function ruleTypeColor(c: Colors): Record<string, string> {
  return {
    bonus: c.green,
    fine: c.red,
    deduction: c.orange,
  };
}

export default function PayrollScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRow[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create-period modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cpName, setCpName] = useState("");
  const [cpStart, setCpStart] = useState("");
  const [cpEnd, setCpEnd] = useState("");

  // rules modal
  const [rulesOpen, setRulesOpen] = useState(false);

  // payslip modal
  const [payslipOpen, setPayslipOpen] = useState(false);
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const selected = periods.find((p) => p.id === selectedId) ?? null;

  const loadPayrolls = useCallback(async (periodId: number) => {
    setLoadingPayrolls(true);
    try {
      setPayrolls(await listPayrolls(periodId));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingPayrolls(false);
    }
  }, []);

  const loadPeriods = useCallback(async (keepId?: number | null) => {
    setError(null);
    try {
      const list = await listPeriods();
      setPeriods(list);
      const pick =
        keepId != null && list.some((p) => p.id === keepId)
          ? keepId
          : list.length > 0
          ? list[0].id
          : null;
      setSelectedId(pick);
      if (pick != null) await loadPayrolls(pick);
      else setPayrolls([]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoadingPeriods(false);
    }
  }, [loadPayrolls]);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  async function reloadAll() {
    setLoadingPeriods(true);
    await loadPeriods(selectedId);
  }

  function selectPeriod(p: PayrollPeriod) {
    setSelectedId(p.id);
    loadPayrolls(p.id);
  }

  async function runAction(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await loadPeriods(selectedId);
    } catch (err) {
      Alert.alert(label, apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onCalculate() {
    if (!selected) return;
    runAction(t("payroll.calculate"), () => calculatePeriod(selected.id));
  }

  function onClose() {
    if (!selected) return;
    Alert.alert(t("payroll.close"), t("payroll.confirmClose"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("payroll.close"), style: "destructive", onPress: () => runAction(t("payroll.close"), () => closePeriod(selected.id)) },
    ]);
  }

  function onMarkPaid() {
    if (!selected) return;
    Alert.alert(t("payroll.statusPaid"), t("payroll.confirmPaid"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("payroll.statusPaid"), onPress: () => runAction(t("payroll.statusPaid"), () => markPeriodPaid(selected.id)) },
    ]);
  }

  function onReopen() {
    if (!selected) return;
    runAction(t("payroll.reopen"), () => reopenPeriod(selected.id));
  }

  function onDeletePeriod() {
    if (!selected) return;
    Alert.alert(t("common.delete"), t("payroll.confirmDeletePeriod"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deletePeriod(selected.id);
            await loadPeriods(null);
          } catch (err) {
            Alert.alert(t("common.delete"), apiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function submitCreatePeriod() {
    const name = cpName.trim();
    if (!name || !cpStart.trim() || !cpEnd.trim()) {
      Alert.alert(t("payroll.newPeriod"), t("payroll.newPeriodValidation"));
      return;
    }
    setBusy(true);
    try {
      const created = await createPeriod({ name, startDate: cpStart.trim(), endDate: cpEnd.trim() });
      setCreateOpen(false);
      setCpName(""); setCpStart(""); setCpEnd("");
      await loadPeriods(created.id);
    } catch (err) {
      Alert.alert(t("payroll.newPeriod"), apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openPayslip(row: PayrollRow) {
    setPayslipOpen(true);
    setPayslip(null);
    setPayslipLoading(true);
    try {
      setPayslip(await getPayslip(row.id));
    } catch (err) {
      Alert.alert(t("payroll.payslip"), apiErrorMessage(err));
      setPayslipOpen(false);
    } finally {
      setPayslipLoading(false);
    }
  }

  async function reloadPayslip() {
    if (!payslip) return;
    try {
      setPayslip(await getPayslip(payslip.payroll.id));
    } catch (err) {
      Alert.alert(t("payroll.payslip"), apiErrorMessage(err));
    }
    if (selectedId != null) await loadPayrolls(selectedId);
  }

  const status: PeriodStatus | null = selected?.status ?? null;
  const canCalc = status === "open" || status === "calculated";
  const canClose = status === "open" || status === "calculated";
  const canMarkPaid = status === "closed";
  const canReopen = status === "closed" || status === "paid";
  const canDelete = status === "open" && payrolls.length === 0;
  const editable = status === "open" || status === "calculated";

  if (loadingPeriods) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t("payroll.title")}</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} onPress={() => setRulesOpen(true)}>
            <Ionicons name="construct" size={20} color={colors.brand} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setCreateOpen(true)}>
            <Ionicons name="add" size={24} color={colors.brand} />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {periods.length === 0 ? (
            <Text style={styles.dimText}>{t("payroll.noPeriods")}</Text>
          ) : (
            periods.map((p) => {
              const active = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => selectPeriod(p)}
                  style={[styles.periodChip, active && styles.periodChipActive]}
                >
                  <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>{p.name}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      {selected && (
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: periodStatusColor(colors)[selected.status] }]}>
            <Text style={styles.badgeText}>{t(periodStatusLabelKey[selected.status])}</Text>
          </View>
          <Text style={styles.periodDates}>{selected.startDate} — {selected.endDate}</Text>
        </View>
      )}

      {selected && (
        <View style={styles.actionsRow}>
          {canCalc && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.brand }]} disabled={busy} onPress={onCalculate}>
              <Text style={styles.actionText}>{t("payroll.calculate")}</Text>
            </Pressable>
          )}
          {canClose && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.orange }]} disabled={busy} onPress={onClose}>
              <Text style={styles.actionText}>{t("payroll.close")}</Text>
            </Pressable>
          )}
          {canMarkPaid && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.green }]} disabled={busy} onPress={onMarkPaid}>
              <Text style={styles.actionText}>{t("payroll.statusPaid")}</Text>
            </Pressable>
          )}
          {canReopen && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.grape }]} disabled={busy} onPress={onReopen}>
              <Text style={styles.actionText}>{t("payroll.reopen")}</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.red }]} disabled={busy} onPress={onDeletePeriod}>
              <Text style={styles.actionText}>{t("common.delete")}</Text>
            </Pressable>
          )}
          {busy && <ActivityIndicator color={colors.brand} style={{ marginLeft: 4 }} />}
        </View>
      )}

      <FlatList
        data={payrolls}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={payrolls.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loadingPayrolls}
            onRefresh={() => { if (selectedId != null) loadPayrolls(selectedId); }}
          />
        }
        ListEmptyComponent={
          loadingPayrolls ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text style={styles.dimText}>{selected ? t("payroll.noPayrolls") : t("payroll.selectPeriod")}</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.payRow} onPress={() => openPayslip(item)}>
            <View style={styles.payRowLeft}>
              <Text style={styles.empName}>{item.employeeName}</Text>
              <Text style={styles.grossText}>{t("payroll.grossLabel")}: {formatMoney(item.gross, item.currency)}</Text>
            </View>
            <Text style={styles.netText}>{formatMoney(item.net, item.currency)}</Text>
          </Pressable>
        )}
      />

      {/* ---- Create period modal ---- */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("payroll.newPeriod")}</Text>
            <Text style={styles.fieldLabel}>{t("common.name")}</Text>
            <TextInput style={styles.input} value={cpName} onChangeText={setCpName} placeholder="2026-Iyun" />
            <Text style={styles.fieldLabel}>{t("payroll.startDate")}</Text>
            <TextInput style={styles.input} value={cpStart} onChangeText={setCpStart} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <Text style={styles.fieldLabel}>{t("payroll.endDate")}</Text>
            <TextInput style={styles.input} value={cpEnd} onChangeText={setCpEnd} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setCreateOpen(false)}>
                <Text style={styles.modalBtnGhostText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} disabled={busy} onPress={submitCreatePeriod}>
                <Text style={styles.modalBtnPrimaryText}>{t("common.save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Rules modal ---- */}
      <RulesModal visible={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* ---- Payslip modal ---- */}
      <Modal visible={payslipOpen} animationType="slide" onRequestClose={() => setPayslipOpen(false)}>
        <PayslipView
          payslip={payslip}
          loading={payslipLoading}
          editable={editable}
          onClose={() => setPayslipOpen(false)}
          onChanged={reloadPayslip}
        />
      </Modal>
    </View>
  );
}

/* ===================== Payslip view ===================== */

function PayslipView({
  payslip, loading, editable, onClose, onChanged,
}: {
  payslip: Payslip | null;
  loading: boolean;
  editable: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [adjType, setAdjType] = useState<string>(ADJ_TYPES[0]);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [saving, setSaving] = useState(false);

  const row = payslip?.payroll ?? null;
  const currency = row?.currency ?? "UZS";
  const adjustments = payslip?.adjustments ?? [];

  async function submitAdjustment() {
    if (!row) return;
    const amount = Number(adjAmount);
    if (!adjAmount.trim() || Number.isNaN(amount)) {
      Alert.alert(t("payroll.adjustment"), t("payroll.adjustmentValidation"));
      return;
    }
    setSaving(true);
    try {
      await addAdjustment(row.id, { type: adjType, amount, reason: adjReason.trim() });
      setAdjAmount(""); setAdjReason(""); setAdjType(ADJ_TYPES[0]);
      await onChanged();
    } catch (err) {
      Alert.alert(t("payroll.adjustment"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function onDeleteAdj(a: Adjustment) {
    if (!row) return;
    Alert.alert(t("common.delete"), t("payroll.confirmDeleteAdjustment"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdjustment(row.id, a.id);
            await onChanged();
          } catch (err) {
            Alert.alert(t("common.delete"), apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.fullModal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{t("payroll.payslip")}</Text>
        <Pressable onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      {loading || !row ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <Text style={styles.empNameBig}>{row.employeeName}</Text>

          <View style={styles.metricsCard}>
            <Metric label={t("payroll.metricModel")} value={row.model} />
            <Metric label={t("payroll.metricWorkedHours")} value={String(row.workedHours)} />
            <Metric label={t("payroll.metricWorkedDays")} value={String(row.workedDays)} />
            <Metric label={t("payroll.metricLateMinutes")} value={String(row.lateMinutes)} />
            <Metric label={t("payroll.metricOvertimeMinutes")} value={String(row.overtimeMinutes)} />
            <Metric label={t("payroll.metricGross")} value={formatMoney(row.gross, currency)} />
            <Metric label={t("payroll.metricBonus")} value={formatMoney(row.totalBonus, currency)} />
            <Metric label={t("payroll.metricFine")} value={formatMoney(row.totalFine, currency)} />
            <Metric label={t("payroll.metricDeduction")} value={formatMoney(row.totalDeduction, currency)} />
            <Metric label={t("payroll.metricNet")} value={formatMoney(row.net, currency)} strong />
          </View>

          <Text style={styles.sectionTitle}>{t("payroll.adjustments")}</Text>
          {adjustments.length === 0 ? (
            <Text style={styles.dimText}>{t("payroll.noAdjustments")}</Text>
          ) : (
            adjustments.map((a) => {
              const manual = a.ruleId == null;
              return (
                <View key={a.id} style={styles.adjRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adjType}>{a.type}{manual ? "" : ` ${t("payroll.automaticSuffix")}`}</Text>
                    {!!a.reason && <Text style={styles.adjReason}>{a.reason}</Text>}
                  </View>
                  <Text style={styles.adjAmount}>{formatMoney(a.amount, currency)}</Text>
                  {manual && editable && (
                    <Pressable onPress={() => onDeleteAdj(a)} style={styles.adjDelBtn}>
                      <Ionicons name="trash" size={18} color={colors.red} />
                    </Pressable>
                  )}
                </View>
              );
            })
          )}

          {editable && (
            <View style={styles.addAdjCard}>
              <Text style={styles.sectionTitle}>{t("payroll.addAdjustment")}</Text>
              <Text style={styles.fieldLabel}>{t("payroll.adjustmentType")}</Text>
              <ChipSelector options={ADJ_TYPES} value={adjType} onChange={setAdjType} />
              <Text style={styles.fieldLabel}>{t("common.amount")}</Text>
              <TextInput
                style={styles.input}
                value={adjAmount}
                onChangeText={setAdjAmount}
                placeholder="0"
                keyboardType="numeric"
              />
              <Text style={styles.fieldLabel}>{t("common.reason")}</Text>
              <TextInput
                style={styles.input}
                value={adjReason}
                onChangeText={setAdjReason}
                placeholder={t("common.reason")}
              />
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary, { marginTop: 12 }]} disabled={saving} onPress={submitAdjustment}>
                <Text style={styles.modalBtnPrimaryText}>{saving ? t("payroll.saving") : t("common.add")}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, strong && styles.metricValueStrong]}>{value}</Text>
    </View>
  );
}

/* ===================== Rules modal ===================== */

interface RuleForm {
  id: number | null;
  name: string;
  type: string;
  trigger: string;
  amountType: string;
  amountValue: string;
  isActive: boolean;
}

const emptyRuleForm: RuleForm = {
  id: null,
  name: "",
  type: RULE_TYPES[0],
  trigger: RULE_TRIGGERS[0],
  amountType: RULE_AMOUNT_TYPES[0],
  amountValue: "",
  isActive: true,
};

function RulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyRuleForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await listRules());
    } catch (err) {
      Alert.alert(t("payroll.rules"), apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  function openCreate() {
    setForm(emptyRuleForm);
    setFormOpen(true);
  }

  function openEdit(r: PayrollRule) {
    setForm({
      id: r.id,
      name: r.name,
      type: r.type,
      trigger: r.trigger,
      amountType: r.amountType,
      amountValue: String(r.amountValue),
      isActive: r.isActive,
    });
    setFormOpen(true);
  }

  async function toggleActive(r: PayrollRule, next: boolean) {
    try {
      await updateRule(r.id, {
        name: r.name, type: r.type, trigger: r.trigger,
        amountType: r.amountType, amountValue: r.amountValue, isActive: next,
      });
      await load();
    } catch (err) {
      Alert.alert(t("payroll.rules"), apiErrorMessage(err));
    }
  }

  function onDeleteRule(r: PayrollRule) {
    Alert.alert(t("common.delete"), t("payroll.confirmDeleteRule", { name: r.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRule(r.id);
            await load();
          } catch (err) {
            Alert.alert(t("common.delete"), apiErrorMessage(err));
          }
        },
      },
    ]);
  }

  async function submitForm() {
    const name = form.name.trim();
    const amountValue = Number(form.amountValue);
    if (!name || form.amountValue.trim() === "" || Number.isNaN(amountValue)) {
      Alert.alert(t("payroll.rule"), t("payroll.ruleValidation"));
      return;
    }
    setSaving(true);
    const body = {
      name,
      type: form.type,
      trigger: form.trigger,
      amountType: form.amountType,
      amountValue,
      isActive: form.isActive,
    };
    try {
      if (form.id == null) await createRule(body);
      else await updateRule(form.id, body);
      setFormOpen(false);
      await load();
    } catch (err) {
      Alert.alert(t("payroll.rule"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fullModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("payroll.rules")}</Text>
          <View style={styles.topActions}>
            <Pressable onPress={openCreate} style={styles.iconBtn}>
              <Ionicons name="add" size={24} color={colors.brand} />
            </Pressable>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>
        ) : (
          <FlatList
            data={rules}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={rules.length === 0 ? styles.listEmpty : styles.list}
            ListEmptyComponent={<Text style={styles.dimText}>{t("payroll.noRules")}</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.ruleRow} onPress={() => openEdit(item)}>
                <View style={{ flex: 1 }}>
                  <View style={styles.ruleTopRow}>
                    <Text style={styles.ruleName}>{item.name}</Text>
                    <View style={[styles.badgeSm, { backgroundColor: ruleTypeColor(colors)[item.type] ?? colors.dim }]}>
                      <Text style={styles.badgeText}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.ruleMeta}>{item.trigger}</Text>
                  <Text style={styles.ruleMeta}>{item.amountType}: {item.amountValue}</Text>
                </View>
                <View style={styles.ruleRight}>
                  <Switch value={item.isActive} onValueChange={(v) => toggleActive(item, v)} />
                  <Pressable onPress={() => onDeleteRule(item)} style={styles.adjDelBtn}>
                    <Ionicons name="trash" size={18} color={colors.red} />
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
        )}

        {/* rule form */}
        <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ScrollView>
                <Text style={styles.modalTitle}>{form.id == null ? t("payroll.newRule") : t("payroll.editRule")}</Text>
                <Text style={styles.fieldLabel}>{t("common.name")}</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder={t("payroll.ruleNamePlaceholder")}
                />
                <Text style={styles.fieldLabel}>{t("payroll.ruleType")}</Text>
                <ChipSelector options={RULE_TYPES} value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} />
                <Text style={styles.fieldLabel}>{t("payroll.ruleTrigger")}</Text>
                <ChipSelector options={RULE_TRIGGERS} value={form.trigger} onChange={(v) => setForm((f) => ({ ...f, trigger: v }))} />
                <Text style={styles.fieldLabel}>{t("payroll.ruleAmountType")}</Text>
                <ChipSelector options={RULE_AMOUNT_TYPES} value={form.amountType} onChange={(v) => setForm((f) => ({ ...f, amountType: v }))} />
                <Text style={styles.fieldLabel}>{t("payroll.ruleAmountValue")}</Text>
                <TextInput
                  style={styles.input}
                  value={form.amountValue}
                  onChangeText={(v) => setForm((f) => ({ ...f, amountValue: v }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>{t("common.active")}</Text>
                  <Switch value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                </View>
                <View style={styles.modalBtnRow}>
                  <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setFormOpen(false)}>
                    <Text style={styles.modalBtnGhostText}>{t("common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} disabled={saving} onPress={submitForm}>
                    <Text style={styles.modalBtnPrimaryText}>{saving ? t("payroll.saving") : t("common.save")}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

/* ===================== Chip selector ===================== */

function ChipSelector({
  options, value, onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chipSelectorRow}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.selChip, active && styles.selChipActive]}
          >
            <Text style={[styles.selChipText, active && styles.selChipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ===================== Styles ===================== */

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flexGrow: 1, flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    topBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
    },
    title: { fontSize: 20, fontWeight: "800", color: c.text },
    topActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    iconBtn: { padding: 6, borderRadius: 8 },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginHorizontal: 16, marginBottom: 8 },

    chipsWrap: { paddingVertical: 4 },
    chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
    periodChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    periodChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    periodChipText: { color: c.text, fontWeight: "600" },
    periodChipTextActive: { color: "#fff" },

    statusRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginTop: 6 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    badgeSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    periodDates: { color: c.dim, fontSize: 13 },

    actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
    actionBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
    actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    list: { padding: 12 },
    listEmpty: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    dimText: { color: c.dim },

    payRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: c.card, borderRadius: 10, padding: 14, marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    payRowLeft: { flex: 1, paddingRight: 8 },
    empName: { fontWeight: "700", color: c.text, fontSize: 15 },
    grossText: { color: c.dim, fontSize: 12, marginTop: 2 },
    netText: { fontWeight: "800", color: c.text, fontSize: 15 },

    // modal generic
    modalBackdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 },
    modalCard: { backgroundColor: c.card, borderRadius: 14, padding: 18, maxHeight: "85%" },
    modalTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 8 },
    fieldLabel: { color: c.dim, fontSize: 13, marginTop: 10, marginBottom: 4, fontWeight: "600" },
    input: {
      backgroundColor: "#fff", borderWidth: 1, borderColor: c.border,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text,
    },
    modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
    modalBtnGhost: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
    modalBtnGhostText: { color: c.text, fontWeight: "700" },
    modalBtnPrimary: { backgroundColor: c.brand },
    modalBtnPrimaryText: { color: "#fff", fontWeight: "700" },

    // full modal
    fullModal: { flex: 1, backgroundColor: c.bg },
    modalHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
      borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
    },
    modalScroll: { padding: 16 },
    empNameBig: { fontSize: 20, fontWeight: "800", color: c.text, marginBottom: 12 },

    metricsCard: { backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border },
    metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
    metricLabel: { color: c.dim, fontSize: 14 },
    metricValue: { color: c.text, fontSize: 14, fontWeight: "600" },
    metricValueStrong: { fontWeight: "800", fontSize: 16 },

    sectionTitle: { fontSize: 16, fontWeight: "800", color: c.text, marginTop: 18, marginBottom: 8 },
    adjRow: {
      flexDirection: "row", alignItems: "center", backgroundColor: c.card,
      borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border,
    },
    adjType: { fontWeight: "700", color: c.text },
    adjReason: { color: c.dim, fontSize: 12, marginTop: 2 },
    adjAmount: { fontWeight: "700", color: c.text, marginHorizontal: 8 },
    adjDelBtn: { padding: 6 },

    addAdjCard: { backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border, marginTop: 8, marginBottom: 24 },

    // rules
    ruleRow: {
      flexDirection: "row", alignItems: "center", backgroundColor: c.card,
      borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border,
    },
    ruleTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleName: { fontWeight: "700", color: c.text, fontSize: 15 },
    ruleMeta: { color: c.dim, fontSize: 12, marginTop: 2 },
    ruleRight: { alignItems: "center", gap: 4 },

    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },

    chipSelectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    selChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
    },
    selChipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    selChipText: { color: c.text, fontSize: 13 },
    selChipTextActive: { color: c.brandDark, fontWeight: "700" },
  });
}
