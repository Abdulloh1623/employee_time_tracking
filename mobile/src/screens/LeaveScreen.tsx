import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Pressable, Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { listLeaveRequests, decideLeave } from "../api/leave";
import { apiErrorMessage } from "../api/client";
import type { LeaveRequest } from "../types";
import { useTheme, type Colors } from "../theme";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const FILTERS: { value: StatusFilter; labelKey: string }[] = [
  { value: "all", labelKey: "leave.filterAll" },
  { value: "pending", labelKey: "leave.statusPending" },
  { value: "approved", labelKey: "leave.statusApproved" },
  { value: "rejected", labelKey: "leave.statusRejected" },
];

const statusMeta: Record<LeaveRequest["status"], { labelKey: string; color: keyof Colors }> = {
  pending: { labelKey: "leave.statusPending", color: "orange" },
  approved: { labelKey: "leave.statusApproved", color: "green" },
  rejected: { labelKey: "leave.statusRejected", color: "red" },
  cancelled: { labelKey: "leave.statusCancelled", color: "dim" },
};

export default function LeaveScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listLeaveRequests({ status: filter === "all" ? undefined : filter });
      setRows(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  async function runDecision(item: LeaveRequest, decision: "approved" | "rejected") {
    setBusyId(item.id);
    try {
      await decideLeave(item.id, decision);
      await load();
    } catch (err) {
      Alert.alert(t("common.error"), apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmDecision(item: LeaveRequest, decision: "approved" | "rejected") {
    const isApprove = decision === "approved";
    Alert.alert(
      isApprove ? t("common.confirm") : t("leave.reject"),
      `${item.employeeName} — ${item.leaveTypeName} (${item.dateFrom} — ${item.dateTo})\n${
        isApprove ? t("leave.confirmApprove") : t("leave.confirmReject")
      }`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: isApprove ? t("common.confirm") : t("leave.reject"),
          style: isApprove ? "default" : "destructive",
          onPress: () => runDecision(item, decision),
        },
      ],
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.filterBar}>
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(f.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={rows.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        ListEmptyComponent={<Text style={styles.empty}>{t("leave.empty")}</Text>}
        renderItem={({ item }) => {
          const meta = statusMeta[item.status];
          const isPending = item.status === "pending";
          const busy = busyId === item.id;
          return (
            <View style={styles.row}>
              <View style={styles.rowHead}>
                <View style={styles.rowHeadLeft}>
                  <Text style={styles.emp}>{item.employeeName}</Text>
                  <Text style={styles.leaveType}>{item.leaveTypeName}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors[meta.color] }]}>
                  <Text style={styles.badgeText}>{t(meta.labelKey)}</Text>
                </View>
              </View>

              <Text style={styles.dates}>
                {item.dateFrom} — {item.dateTo} · {t("leave.days", { n: item.days })}
              </Text>
              {!!item.reason && <Text style={styles.reason}>{item.reason}</Text>}

              {isPending && (
                <View style={styles.actions}>
                  {busy ? (
                    <ActivityIndicator color={colors.brand} style={styles.actionsBusy} />
                  ) : (
                    <>
                      <Pressable
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => confirmDecision(item, "approved")}
                      >
                        <Text style={styles.approveText}>{t("common.confirm")}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => confirmDecision(item, "rejected")}
                      >
                        <Text style={styles.rejectText}>{t("leave.reject")}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: c.bg },
    filterBar: {
      flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
      backgroundColor: c.bg,
    },
    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
      borderColor: c.border, backgroundColor: c.card,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.dim, fontWeight: "600", fontSize: 13 },
    chipTextActive: { color: "#fff" },
    list: { padding: 12 },
    emptyWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    empty: { color: c.dim },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },
    row: {
      backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: c.border,
    },
    rowHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    rowHeadLeft: { flex: 1, paddingRight: 8 },
    emp: { fontWeight: "800", color: c.text, fontSize: 15 },
    leaveType: { color: c.dim, fontSize: 13, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    dates: { color: c.text, marginTop: 8, fontSize: 13 },
    reason: { color: c.dim, fontSize: 12, marginTop: 4, fontStyle: "italic" },
    actions: { flexDirection: "row", gap: 8, marginTop: 12 },
    actionsBusy: { marginTop: 4, alignSelf: "flex-start" },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", borderWidth: 1 },
    approveBtn: { backgroundColor: c.greenLight, borderColor: c.green },
    approveText: { color: c.green, fontWeight: "700" },
    rejectBtn: { backgroundColor: c.redLight, borderColor: c.red },
    rejectText: { color: c.red, fontWeight: "700" },
  });
}
