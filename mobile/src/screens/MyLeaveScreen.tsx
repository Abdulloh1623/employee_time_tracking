import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator,
  Pressable, Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  myLeaveBalances, myLeaveRequests, myLeaveTypes, submitMyLeave,
} from "../api/me";
import { apiErrorMessage } from "../api/client";
import { useToast } from "../components/Toast";
import type { LeaveBalance, LeaveRequest, LeaveType } from "../types";
import { useTheme, type Colors } from "../theme";

const STATUS_KEYS: Record<string, string> = {
  pending: "leave.statusPending", approved: "leave.statusApproved",
  rejected: "leave.statusRejected", cancelled: "leave.statusCancelled",
};
function statusColor(c: Colors, s: string): string {
  return s === "approved" ? c.green : s === "rejected" ? c.red : s === "cancelled" ? c.dim : c.orange;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function MyLeaveScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, r, ty] = await Promise.all([myLeaveBalances(), myLeaveRequests(), myLeaveTypes()]);
      setBalances(b);
      setRequests(r);
      setTypes(ty);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal() {
    setTypeId(types[0]?.id ?? null);
    setFrom(todayIso());
    setTo(todayIso());
    setReason("");
    setModalOpen(true);
  }

  async function submit() {
    if (!typeId) { toast.show(t("me.pickType"), "error"); return; }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) { toast.show(t("settings.invalidDate"), "error"); return; }
    if (to < from) { toast.show(t("me.invalidRange"), "error"); return; }
    setBusy(true);
    try {
      await submitMyLeave({ leaveTypeId: typeId, dateFrom: from, dateTo: to, reason: reason.trim() || undefined });
      setModalOpen(false);
      toast.show(t("me.leaveSubmitted"), "success");
      await load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
      >
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.section}>{t("me.balances")}</Text>
        {balances.length === 0 ? (
          <Text style={styles.empty}>{t("me.noBalances")}</Text>
        ) : (
          <View style={styles.balRow}>
            {balances.map((b) => (
              <View key={`${b.leaveTypeId}-${b.year}`} style={styles.balCard}>
                <Text style={styles.balName} numberOfLines={1}>{b.leaveTypeName}</Text>
                <Text style={styles.balRemain}>{b.remainingDays}</Text>
                <Text style={styles.balOf}>/ {b.entitledDays} {t("me.daysShort")}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.section}>{t("me.myRequests")}</Text>
        {requests.length === 0 ? (
          <Text style={styles.empty}>{t("leave.empty")}</Text>
        ) : (
          requests.map((r) => (
            <View key={r.id} style={styles.reqRow}>
              <View style={styles.reqLeft}>
                <Text style={styles.reqType}>{r.leaveTypeName}</Text>
                <Text style={styles.reqDates}>{r.dateFrom} → {r.dateTo} · {t("leave.days", { n: r.days })}</Text>
                {r.reason ? <Text style={styles.reqReason} numberOfLines={1}>{r.reason}</Text> : null}
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(colors, r.status) }]}>
                <Text style={styles.badgeText}>{STATUS_KEYS[r.status] ? t(STATUS_KEYS[r.status]) : r.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{t("me.newRequest")}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.dim} />
              </Pressable>
            </View>

            <Text style={styles.label}>{t("me.leaveType")}</Text>
            <View style={styles.chips}>
              {types.map((ty) => {
                const active = ty.id === typeId;
                return (
                  <Pressable
                    key={ty.id}
                    onPress={() => setTypeId(ty.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{ty.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.label}>{t("common.from")}</Text>
                <TextInput
                  style={styles.input}
                  value={from}
                  onChangeText={setFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.dim}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.label}>{t("common.to")}</Text>
                <TextInput
                  style={styles.input}
                  value={to}
                  onChangeText={setTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.dim}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Text style={styles.label}>{t("common.reason")}</Text>
            <TextInput
              style={[styles.input, styles.reasonInput]}
              value={reason}
              onChangeText={setReason}
              placeholder={t("me.reasonPlaceholder")}
              placeholderTextColor={colors.dim}
              multiline
            />

            <Pressable style={[styles.submit, busy && styles.submitDisabled]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t("me.submit")}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: 12, paddingBottom: 96 },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },
    section: { fontWeight: "800", color: c.text, fontSize: 15, marginTop: 8, marginBottom: 8 },
    empty: { color: c.dim, marginBottom: 8 },

    balRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    balCard: { backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border, minWidth: 150, flexGrow: 1 },
    balName: { color: c.dim, fontSize: 13 },
    balRemain: { color: c.brand, fontSize: 26, fontWeight: "800", marginTop: 4 },
    balOf: { color: c.dim, fontSize: 12 },

    reqRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    reqLeft: { flex: 1, paddingRight: 8 },
    reqType: { fontWeight: "700", color: c.text },
    reqDates: { color: c.dim, fontSize: 12, marginTop: 2 },
    reqReason: { color: c.dim, fontSize: 12, marginTop: 2, fontStyle: "italic" },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    fab: { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

    modalWrap: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    modalCard: { backgroundColor: c.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: c.text },
    label: { color: c.dim, fontWeight: "600", marginBottom: 6, marginTop: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.text, fontWeight: "600" },
    chipTextActive: { color: "#fff" },
    dateRow: { flexDirection: "row", gap: 12 },
    dateCol: { flex: 1 },
    input: { backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text, borderWidth: 1, borderColor: c.border },
    reasonInput: { minHeight: 64, textAlignVertical: "top" },
    submit: { backgroundColor: c.brand, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    submitDisabled: { opacity: 0.7 },
    submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  });
}
