import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, Pressable, TextInput, Modal, ActivityIndicator,
  RefreshControl, StyleSheet, Switch, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { listDepartments, listPositions } from "../api/employees";
import {
  createDepartment, updateDepartment, deleteDepartment,
  createPosition, updatePosition, deletePosition,
  listHolidays, createHoliday, updateHoliday, deleteHoliday,
} from "../api/org";
import { listLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from "../api/leave";
import { apiErrorMessage } from "../api/client";
import { iso } from "../format";
import { useTheme, type Colors } from "../theme";
import type { Department, Position, Holiday, LeaveType, DayType } from "../types";

type Section = "departments" | "positions" | "leaveTypes" | "holidays";

const SECTIONS: { key: Section; labelKey: string }[] = [
  { key: "departments", labelKey: "settings.departments" },
  { key: "positions", labelKey: "settings.positions" },
  { key: "leaveTypes", labelKey: "settings.leaveTypes" },
  { key: "holidays", labelKey: "settings.holidays" },
];

const DAY_TYPES: DayType[] = ["holiday", "weekend", "workday"];
const DAY_TYPE_LABEL_KEY: Record<DayType, string> = {
  holiday: "settings.dayType.holiday",
  weekend: "status.day_off",
  workday: "settings.dayType.workday",
};
function dayTypeColors(t: DayType, c: Colors): { bg: string; fg: string } {
  if (t === "holiday") return { bg: c.redLight, fg: c.red };
  if (t === "workday") return { bg: c.greenLight, fg: c.green };
  return { bg: c.border, fg: c.dim };
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [section, setSection] = useState<Section>("departments");
  return (
    <View style={styles.screen}>
      <View style={styles.segment}>
        {SECTIONS.map((s) => {
          const active = s.key === section;
          return (
            <Pressable
              key={s.key}
              style={[styles.segChip, active && styles.segChipActive]}
              onPress={() => setSection(s.key)}
            >
              <Text style={[styles.segChipText, active && styles.segChipTextActive]}>{t(s.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      {section === "departments" && <DepartmentsSection />}
      {section === "positions" && <PositionsSection />}
      {section === "leaveTypes" && <LeaveTypesSection />}
      {section === "holidays" && <HolidaysSection />}
    </View>
  );
}

/* ---------------- Departments ---------------- */

function DepartmentsSection() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listDepartments());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setName(""); setModal(true); }
  function openEdit(d: Department) { setEditing(d); setName(d.name); setModal(true); }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert(t("common.error"), t("settings.nameRequired")); return; }
    setSaving(true);
    try {
      if (editing) await updateDepartment(editing.id, { name: trimmed });
      else await createDepartment({ name: trimmed });
      setModal(false);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(d: Department) {
    Alert.alert(t("common.delete"), t("settings.deleteConfirm", { name: d.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try { await deleteDepartment(d.id); await load(); }
          catch (err) { Alert.alert(t("common.error"), apiErrorMessage(err)); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <>
      <ListShell
        error={error}
        onRefresh={load}
        empty={t("settings.noDepartments")}
        data={items}
        keyOf={(d) => d.id}
        renderItem={(d) => (
          <RowShell title={d.name} onEdit={() => openEdit(d)} onDelete={() => confirmDelete(d)} />
        )}
      />
      <AddButton onPress={openNew} />
      <FormModal
        visible={modal}
        title={editing ? t("settings.editDepartment") : t("settings.newDepartment")}
        onClose={() => setModal(false)}
        onSave={save}
        saving={saving}
      >
        <Field label={t("common.name")}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t("settings.departmentNamePlaceholder")} placeholderTextColor={colors.dim} />
        </Field>
      </FormModal>
    </>
  );
}

/* ---------------- Positions ---------------- */

function PositionsSection() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listPositions());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setTitle(""); setModal(true); }
  function openEdit(p: Position) { setEditing(p); setTitle(p.title); setModal(true); }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) { Alert.alert(t("common.error"), t("settings.nameRequired")); return; }
    setSaving(true);
    try {
      if (editing) await updatePosition(editing.id, { title: trimmed });
      else await createPosition({ title: trimmed });
      setModal(false);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(p: Position) {
    Alert.alert(t("common.delete"), t("settings.deleteConfirm", { name: p.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try { await deletePosition(p.id); await load(); }
          catch (err) { Alert.alert(t("common.error"), apiErrorMessage(err)); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <>
      <ListShell
        error={error}
        onRefresh={load}
        empty={t("settings.noPositions")}
        data={items}
        keyOf={(p) => p.id}
        renderItem={(p) => (
          <RowShell title={p.title} onEdit={() => openEdit(p)} onDelete={() => confirmDelete(p)} />
        )}
      />
      <AddButton onPress={openNew} />
      <FormModal
        visible={modal}
        title={editing ? t("settings.editPosition") : t("settings.newPosition")}
        onClose={() => setModal(false)}
        onSave={save}
        saving={saving}
      >
        <Field label={t("common.name")}>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t("settings.positionNamePlaceholder")} placeholderTextColor={colors.dim} />
        </Field>
      </FormModal>
    </>
  );
}

/* ---------------- Leave types ---------------- */

function LeaveTypesSection() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [name, setName] = useState("");
  const [defaultDays, setDefaultDays] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listLeaveTypes());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null); setName(""); setDefaultDays(""); setIsPaid(true); setModal(true);
  }
  function openEdit(lt: LeaveType) {
    setEditing(lt); setName(lt.name); setDefaultDays(String(lt.defaultDays)); setIsPaid(lt.isPaid); setModal(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert(t("common.error"), t("settings.nameRequired")); return; }
    const days = Number(defaultDays);
    if (!Number.isFinite(days) || days < 0) { Alert.alert(t("common.error"), t("settings.invalidDays")); return; }
    setSaving(true);
    try {
      const body = { name: trimmed, isPaid, defaultDays: days };
      if (editing) await updateLeaveType(editing.id, body);
      else await createLeaveType(body);
      setModal(false);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(lt: LeaveType) {
    Alert.alert(t("common.delete"), t("settings.deleteConfirm", { name: lt.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try { await deleteLeaveType(lt.id); await load(); }
          catch (err) { Alert.alert(t("common.error"), apiErrorMessage(err)); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <>
      <ListShell
        error={error}
        onRefresh={load}
        empty={t("settings.noLeaveTypes")}
        data={items}
        keyOf={(lt) => lt.id}
        renderItem={(lt) => (
          <RowShell
            title={lt.name}
            subtitle={t("settings.daysCount", { n: lt.defaultDays })}
            badge={{
              text: lt.isPaid ? t("settings.paid") : t("settings.unpaid"),
              bg: lt.isPaid ? colors.greenLight : colors.border,
              fg: lt.isPaid ? colors.green : colors.dim,
            }}
            onEdit={() => openEdit(lt)}
            onDelete={() => confirmDelete(lt)}
          />
        )}
      />
      <AddButton onPress={openNew} />
      <FormModal
        visible={modal}
        title={editing ? t("settings.editLeaveType") : t("settings.newLeaveType")}
        onClose={() => setModal(false)}
        onSave={save}
        saving={saving}
      >
        <Field label={t("common.name")}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t("settings.leaveTypeNamePlaceholder")} placeholderTextColor={colors.dim} />
        </Field>
        <Field label={t("settings.defaultDays")}>
          <TextInput
            style={styles.input}
            value={defaultDays}
            onChangeText={setDefaultDays}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.dim}
          />
        </Field>
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>{t("settings.paid")}</Text>
          <Switch
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ true: colors.brandLight, false: colors.border }}
            thumbColor={isPaid ? colors.brand : colors.dim}
          />
        </View>
      </FormModal>
    </>
  );
}

/* ---------------- Holidays ---------------- */

function HolidaysSection() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [date, setDate] = useState("");
  const [dayType, setDayType] = useState<DayType>("holiday");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listHolidays());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setDate(iso(new Date()));
    setDayType("holiday");
    setDescription("");
    setModal(true);
  }
  function openEdit(h: Holiday) {
    setEditing(h);
    setDate(h.date);
    setDayType(h.dayType);
    setDescription(h.description ?? "");
    setModal(true);
  }

  async function save() {
    const trimmed = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert(t("common.error"), t("settings.invalidDate"));
      return;
    }
    setSaving(true);
    try {
      const body = { date: trimmed, dayType, description: description.trim() || undefined };
      if (editing) await updateHoliday(editing.id, body);
      else await createHoliday(body);
      setModal(false);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(h: Holiday) {
    Alert.alert(t("common.delete"), t("settings.deleteConfirm", { name: h.date }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try { await deleteHoliday(h.id); await load(); }
          catch (err) { Alert.alert(t("common.error"), apiErrorMessage(err)); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <>
      <ListShell
        error={error}
        onRefresh={load}
        empty={t("settings.noHolidays")}
        data={items}
        keyOf={(h) => h.id}
        renderItem={(h) => {
          const badgeColors = dayTypeColors(h.dayType, colors);
          return (
            <RowShell
              title={h.date}
              subtitle={h.description ?? undefined}
              badge={{ text: t(DAY_TYPE_LABEL_KEY[h.dayType]), bg: badgeColors.bg, fg: badgeColors.fg }}
              onEdit={() => openEdit(h)}
              onDelete={() => confirmDelete(h)}
            />
          );
        }}
      />
      <AddButton onPress={openNew} />
      <FormModal
        visible={modal}
        title={editing ? t("settings.editHoliday") : t("settings.newHoliday")}
        onClose={() => setModal(false)}
        onSave={save}
        saving={saving}
      >
        <Field label={t("common.date")}>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
          />
        </Field>
        <Field label={t("settings.dayTypeLabel")}>
          <View style={styles.chipRow}>
            {DAY_TYPES.map((dt) => {
              const active = dt === dayType;
              return (
                <Pressable
                  key={dt}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDayType(dt)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(DAY_TYPE_LABEL_KEY[dt])}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
        <Field label={t("settings.note")}>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t("settings.notePlaceholder")}
            placeholderTextColor={colors.dim}
          />
        </Field>
      </FormModal>
    </>
  );
}

/* ---------------- Shared UI ---------------- */

function Loading() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
}

function ListShell<T>(props: {
  data: T[];
  keyOf: (item: T) => number | string;
  renderItem: (item: T) => React.ReactElement;
  empty: string;
  error: string | null;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, keyOf, renderItem, empty, error, onRefresh } = props;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(keyOf(item))}
      contentContainerStyle={data.length === 0 ? styles.listEmpty : styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
      renderItem={({ item }) => renderItem(item)}
    />
  );
}

function RowShell(props: {
  title: string;
  subtitle?: string;
  badge?: { text: string; bg: string; fg: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { title, subtitle, badge, onEdit, onDelete } = props;
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.text}</Text>
        </View>
      )}
      <Pressable style={styles.iconBtn} onPress={onEdit} hitSlop={8}>
        <Ionicons name="pencil" size={18} color={colors.brand} />
      </Pressable>
      <Pressable style={styles.iconBtn} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash" size={18} color={colors.red} />
      </Pressable>
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Ionicons name="add" size={22} color="#fff" />
      <Text style={styles.fabText}>{t("common.new")}</Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function FormModal(props: {
  visible: boolean;
  title: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { visible, title, saving, onClose, onSave, children } = props;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={onClose} disabled={saving}>
              <Text style={styles.modalBtnCancelText}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnSave]} onPress={onSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSaveText}>{t("common.save")}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    segment: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 10, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    segChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg },
    segChipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    segChipText: { color: c.dim, fontWeight: "600", fontSize: 13 },
    segChipTextActive: { color: c.brandDark },

    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    list: { padding: 12, paddingBottom: 96 },
    listEmpty: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    empty: { color: c.dim },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },

    row: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    rowInfo: { flex: 1, paddingRight: 8 },
    rowTitle: { fontWeight: "700", color: c.text, fontSize: 15 },
    rowSubtitle: { color: c.dim, fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 4 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    iconBtn: { padding: 6, marginLeft: 2 },

    fab: { position: "absolute", right: 16, bottom: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.brand, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, elevation: 3, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    fabText: { color: "#fff", fontWeight: "700" },

    modalBackdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
    modalCard: { backgroundColor: c.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: c.text, marginBottom: 14 },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
    modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
    modalBtnCancel: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
    modalBtnCancelText: { color: c.text, fontWeight: "700" },
    modalBtnSave: { backgroundColor: c.brand },
    modalBtnSaveText: { color: "#fff", fontWeight: "700" },

    field: { marginBottom: 12 },
    fieldLabel: { color: c.dim, fontSize: 13, fontWeight: "600", marginBottom: 6 },
    input: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: c.text, fontSize: 15 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg },
    chipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    chipText: { color: c.dim, fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: c.brandDark },
  });
}
