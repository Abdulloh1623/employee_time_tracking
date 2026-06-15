import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator,
  Pressable, TextInput, Modal, ScrollView, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  listEmployees, createEmployee, updateEmployee,
  activateEmployee, deactivateEmployee, regenerateQr,
  listDepartments, listPositions,
} from "../api/employees";
import { apiErrorMessage } from "../api/client";
import type { Employee, EmployeeCreate, Department, Position } from "../types";
import { useTheme, type Colors } from "../theme";
import { iso } from "../format";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"] as const;
const PAYROLL_MODELS = ["hourly", "fixed_monthly", "per_shift", "mixed"] as const;

const employmentLabelKey: Record<string, string> = {
  full_time: "employees.employment.full_time",
  part_time: "employees.employment.part_time",
  contract: "employees.employment.contract",
};
const payrollLabelKey: Record<string, string> = {
  hourly: "employees.payroll.hourly",
  fixed_monthly: "employees.payroll.fixed_monthly",
  per_shift: "employees.payroll.per_shift",
  mixed: "employees.payroll.mixed",
};

type FormState = {
  firstName: string;
  lastName: string;
  departmentId: number | null;
  positionId: number | null;
  employmentType: string;
  payrollModel: string;
  hireDate: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  departmentId: null,
  positionId: null,
  employmentType: "full_time",
  payrollModel: "hourly",
  hireDate: iso(new Date()),
};

export default function EmployeesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [pickDept, setPickDept] = useState(false);
  const [pickPos, setPickPos] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const deptMap = useMemo(() => {
    const m = new Map<number, string>();
    departments.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const posMap = useMemo(() => {
    const m = new Map<number, string>();
    positions.forEach((p) => m.set(p.id, p.title));
    return m;
  }, [positions]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [empRes, depts, poss] = await Promise.all([
        listEmployees({ perPage: 200 }),
        listDepartments(),
        listPositions(),
      ]);
      setEmployees(empRes.data);
      setDepartments(depts);
      setPositions(poss);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const reloadEmployees = useCallback(async (): Promise<Employee | null> => {
    try {
      const res = await listEmployees({ perPage: 200 });
      setEmployees(res.data);
      return res.data.find((e) => e.id === detail?.id) ?? null;
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
      return null;
    }
  }, [detail, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
    );
  }, [employees, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      departmentId: departments[0]?.id ?? null,
      positionId: positions[0]?.id ?? null,
    });
    setFormOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
      employmentType: emp.employmentType,
      payrollModel: emp.payrollModel,
      hireDate: emp.hireDate,
    });
    setDetail(null);
    setFormOpen(true);
  }

  async function save() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert(t("common.error"), t("employees.errFirstLastRequired"));
      return;
    }
    if (form.departmentId == null || form.positionId == null) {
      Alert.alert(t("common.error"), t("employees.errDeptPosRequired"));
      return;
    }
    const body: EmployeeCreate = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      departmentId: form.departmentId,
      positionId: form.positionId,
      employmentType: form.employmentType,
      payrollModel: form.payrollModel,
      hireDate: form.hireDate.trim(),
    };
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, body);
      } else {
        await createEmployee(body);
      }
      setFormOpen(false);
      setEditing(null);
      await load();
      Alert.alert(t("employees.savedTitle"), editing ? t("employees.savedUpdated") : t("employees.savedCreated"));
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmToggle(emp: Employee) {
    const isActive = emp.status === "active";
    Alert.alert(
      isActive ? t("employees.deactivate") : t("employees.activate"),
      t("employees.toggleConfirm", { name: `${emp.lastName} ${emp.firstName}` }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isActive ? t("employees.deactivate") : t("employees.activate"),
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            setBusyAction(true);
            try {
              if (isActive) {
                await deactivateEmployee(emp.id);
              } else {
                await activateEmployee(emp.id);
              }
              const updated = await reloadEmployees();
              if (updated) setDetail(updated);
            } catch (err) {
              Alert.alert(t("common.error"), apiErrorMessage(err));
            } finally {
              setBusyAction(false);
            }
          },
        },
      ]
    );
  }

  function confirmRegenerateQr(emp: Employee) {
    Alert.alert(
      t("employees.newQr"),
      t("employees.newQrConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("employees.newQr"),
          onPress: async () => {
            setBusyAction(true);
            try {
              const updated = await regenerateQr(emp.id);
              setDetail(updated);
              await reloadEmployees();
            } catch (err) {
              Alert.alert(t("common.error"), apiErrorMessage(err));
            } finally {
              setBusyAction(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("employees.searchPlaceholder")}
          placeholderTextColor={colors.dim}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>{t("common.new")}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={filtered.length === 0 ? styles.center : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>{t("employees.notFound")}</Text>}
        renderItem={({ item }) => {
          const active = item.status === "active";
          return (
            <Pressable style={styles.row} onPress={() => setDetail(item)}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{item.lastName} {item.firstName}</Text>
                <Text style={styles.sub}>
                  {deptMap.get(item.departmentId) ?? "—"} · {posMap.get(item.positionId) ?? "—"}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: active ? colors.green : colors.dim }]}>
                <Text style={styles.statusText}>{active ? t("common.active") : t("common.inactive")}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* DETAIL MODAL */}
      <Modal visible={!!detail} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("employees.detailTitle")}</Text>
              <Pressable onPress={() => setDetail(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            {detail && (
              <ScrollView contentContainerStyle={styles.modalBody}>
                <Field label={t("employees.fullName")} value={`${detail.lastName} ${detail.firstName}`} styles={styles} />
                <Field label={t("employees.department")} value={deptMap.get(detail.departmentId) ?? "—"} styles={styles} />
                <Field label={t("employees.position")} value={posMap.get(detail.positionId) ?? "—"} styles={styles} />
                <Field label={t("employees.employmentType")} value={t(employmentLabelKey[detail.employmentType] ?? detail.employmentType)} styles={styles} />
                <Field label={t("employees.payrollModel")} value={t(payrollLabelKey[detail.payrollModel] ?? detail.payrollModel)} styles={styles} />
                <Field label={t("employees.hireDate")} value={detail.hireDate} styles={styles} />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{t("employees.status")}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: detail.status === "active" ? colors.green : colors.dim }]}>
                    <Text style={styles.statusText}>{detail.status === "active" ? t("common.active") : t("common.inactive")}</Text>
                  </View>
                </View>
                <View style={styles.qrBox}>
                  <Text style={styles.fieldLabel}>{t("employees.qrToken")}</Text>
                  <Text selectable style={styles.qrText}>{detail.qrToken ?? "—"}</Text>
                </View>

                {busyAction && <ActivityIndicator color={colors.brand} style={{ marginVertical: 8 }} />}

                <Pressable style={[styles.actBtn, styles.actPrimary]} onPress={() => openEdit(detail)}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.actPrimaryText}>{t("common.edit")}</Text>
                </Pressable>

                {detail.status === "active" ? (
                  <Pressable style={[styles.actBtn, styles.actDanger]} onPress={() => confirmToggle(detail)}>
                    <Ionicons name="person-remove-outline" size={18} color={colors.red} />
                    <Text style={styles.actDangerText}>{t("employees.deactivate")}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.actBtn, styles.actSuccess]} onPress={() => confirmToggle(detail)}>
                    <Ionicons name="person-add-outline" size={18} color={colors.green} />
                    <Text style={styles.actSuccessText}>{t("employees.activate")}</Text>
                  </Pressable>
                )}

                <Pressable style={[styles.actBtn, styles.actNeutral]} onPress={() => confirmRegenerateQr(detail)}>
                  <Ionicons name="qr-code-outline" size={18} color={colors.brand} />
                  <Text style={styles.actNeutralText}>{t("employees.newQr")}</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* FORM MODAL */}
      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? t("employees.editTitle") : t("employees.newTitle")}</Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>{t("employees.firstName")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("employees.firstName")}
                placeholderTextColor={colors.dim}
                value={form.firstName}
                onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
              />

              <Text style={styles.inputLabel}>{t("employees.lastName")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("employees.lastName")}
                placeholderTextColor={colors.dim}
                value={form.lastName}
                onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
              />

              <Text style={styles.inputLabel}>{t("employees.department")}</Text>
              <Pressable style={styles.pickerBtn} onPress={() => setPickDept(true)}>
                <Text style={[styles.pickerText, form.departmentId == null && styles.pickerPlaceholder]}>
                  {form.departmentId != null ? (deptMap.get(form.departmentId) ?? "—") : t("employees.selectDepartment")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.dim} />
              </Pressable>

              <Text style={styles.inputLabel}>{t("employees.position")}</Text>
              <Pressable style={styles.pickerBtn} onPress={() => setPickPos(true)}>
                <Text style={[styles.pickerText, form.positionId == null && styles.pickerPlaceholder]}>
                  {form.positionId != null ? (posMap.get(form.positionId) ?? "—") : t("employees.selectPosition")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.dim} />
              </Pressable>

              <Text style={styles.inputLabel}>{t("employees.employmentType")}</Text>
              <View style={styles.chipRow}>
                {EMPLOYMENT_TYPES.map((et) => (
                  <Chip
                    key={et}
                    label={t(employmentLabelKey[et] ?? et)}
                    selected={form.employmentType === et}
                    onPress={() => setForm((f) => ({ ...f, employmentType: et }))}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>{t("employees.payrollModel")}</Text>
              <View style={styles.chipRow}>
                {PAYROLL_MODELS.map((m) => (
                  <Chip
                    key={m}
                    label={t(payrollLabelKey[m] ?? m)}
                    selected={form.payrollModel === m}
                    onPress={() => setForm((f) => ({ ...f, payrollModel: m }))}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>{t("employees.hireDate")}</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.dim}
                autoCapitalize="none"
                value={form.hireDate}
                onChangeText={(v) => setForm((f) => ({ ...f, hireDate: v }))}
              />

              <View style={styles.formActions}>
                <Pressable style={[styles.formBtn, styles.formCancel]} onPress={() => setFormOpen(false)} disabled={saving}>
                  <Text style={styles.formCancelText}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable style={[styles.formBtn, styles.formSave]} onPress={save} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.formSaveText}>{t("common.save")}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DEPARTMENT PICKER */}
      <PickerModal
        visible={pickDept}
        title={t("employees.selectDepartment")}
        onClose={() => setPickDept(false)}
        items={departments.map((d) => ({ id: d.id, label: d.name }))}
        selectedId={form.departmentId}
        onSelect={(id) => { setForm((f) => ({ ...f, departmentId: id })); setPickDept(false); }}
      />

      {/* POSITION PICKER */}
      <PickerModal
        visible={pickPos}
        title={t("employees.selectPosition")}
        onClose={() => setPickPos(false)}
        items={positions.map((p) => ({ id: p.id, label: p.title }))}
        selectedId={form.positionId}
        onSelect={(id) => { setForm((f) => ({ ...f, positionId: id })); setPickPos(false); }}
      />
    </View>
  );
}

function Field({ label, value, styles }: { label: string; value: string; styles: Styles }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function Chip({ label, selected, onPress, styles }: { label: string; selected: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function PickerModal({
  visible, title, items, selectedId, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  items: { id: number; label: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.id)}
            style={styles.pickerList}
            ListEmptyComponent={<Text style={styles.empty}>{t("employees.emptyList")}</Text>}
            renderItem={({ item }) => {
              const on = item.id === selectedId;
              return (
                <Pressable style={styles.pickerRow} onPress={() => onSelect(item.id)}>
                  <Text style={[styles.pickerRowText, on && styles.pickerRowTextOn]}>{item.label}</Text>
                  {on && <Ionicons name="checkmark" size={20} color={colors.brand} />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    list: { padding: 12 },
    empty: { color: c.dim, textAlign: "center", padding: 16 },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },

    searchRow: { flexDirection: "row", gap: 8, padding: 12, paddingBottom: 4 },
    searchInput: {
      flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.text,
    },
    addBtn: {
      flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brand,
      borderRadius: 10, paddingHorizontal: 12, justifyContent: "center",
    },
    addBtnText: { color: "#fff", fontWeight: "700" },

    row: {
      flexDirection: "row", alignItems: "center", backgroundColor: c.card,
      borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border,
    },
    rowMain: { flex: 1, paddingRight: 8 },
    name: { fontWeight: "700", color: c.text, fontSize: 15 },
    sub: { color: c.dim, fontSize: 12, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    modalBackdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
      maxHeight: "90%", paddingBottom: 12,
    },
    modalHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 17, fontWeight: "800", color: c.text },
    modalBody: { padding: 16, gap: 4 },

    fieldRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    fieldLabel: { color: c.dim, fontSize: 13 },
    fieldValue: { color: c.text, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 },

    qrBox: { paddingVertical: 10, gap: 4 },
    qrText: {
      color: c.text, fontFamily: "monospace", backgroundColor: c.card, borderWidth: 1,
      borderColor: c.border, borderRadius: 8, padding: 10,
    },

    actBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      borderRadius: 10, paddingVertical: 12, marginTop: 10, borderWidth: 1,
    },
    actPrimary: { backgroundColor: c.brand, borderColor: c.brand },
    actPrimaryText: { color: "#fff", fontWeight: "700" },
    actDanger: { backgroundColor: c.redLight, borderColor: c.red },
    actDangerText: { color: c.red, fontWeight: "700" },
    actSuccess: { backgroundColor: c.greenLight, borderColor: c.green },
    actSuccessText: { color: c.green, fontWeight: "700" },
    actNeutral: { backgroundColor: c.brandLight, borderColor: c.brand },
    actNeutralText: { color: c.brand, fontWeight: "700" },

    inputLabel: { color: c.dim, fontSize: 13, marginTop: 12, marginBottom: 4 },
    input: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, color: c.text,
    },
    pickerBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 12,
    },
    pickerText: { color: c.text, fontWeight: "600" },
    pickerPlaceholder: { color: c.dim, fontWeight: "400" },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
      borderColor: c.border, backgroundColor: c.card,
    },
    chipOn: { backgroundColor: c.brandLight, borderColor: c.brand },
    chipText: { color: c.dim, fontSize: 13, fontWeight: "600" },
    chipTextOn: { color: c.brandDark },

    formActions: { flexDirection: "row", gap: 10, marginTop: 20 },
    formBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
    formCancel: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    formCancelText: { color: c.text, fontWeight: "700" },
    formSave: { backgroundColor: c.brand },
    formSaveText: { color: "#fff", fontWeight: "700" },

    pickerList: { paddingHorizontal: 16 },
    pickerRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    pickerRowText: { color: c.text, fontSize: 15 },
    pickerRowTextOn: { color: c.brand, fontWeight: "700" },
  });
}
