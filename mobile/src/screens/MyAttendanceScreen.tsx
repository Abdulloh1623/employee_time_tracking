import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { myAttendance } from "../api/me";
import { apiErrorMessage } from "../api/client";
import type { AttendanceRow } from "../api/attendance";
import { useTheme, type Colors } from "../theme";

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtTime(s: string | null) {
  return s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

function statusColors(c: Colors): Record<string, string> {
  return { present: c.green, late: c.orange, absent: c.red, on_leave: c.brand, sick: c.grape, day_off: c.dim };
}
const STATUS_KEYS: Record<string, string> = {
  present: "status.present", late: "status.late", absent: "status.absent",
  on_leave: "status.on_leave", sick: "status.sick", day_off: "status.day_off",
};

export default function MyAttendanceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = useMemo(() => statusColors(colors), [colors]);

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await myAttendance(iso(startOfMonth()), iso(new Date())));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={rows.length === 0 ? styles.center : styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>{t("attendance.empty")}</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.date}>{item.workDate}</Text>
          </View>
          <View style={styles.rowMid}>
            <Text style={styles.time}>{fmtTime(item.checkInAt)} → {fmtTime(item.checkOutAt)}</Text>
            <Text style={styles.worked}>
              {t("attendance.workedHours", { n: (item.workedMinutes / 60).toFixed(1) })}
              {item.lateMinutes > 0 ? ` · ${t("attendance.lateMinutes", { n: item.lateMinutes })}` : ""}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor[item.status] ?? colors.dim }]}>
            <Text style={styles.badgeText}>{STATUS_KEYS[item.status] ? t(STATUS_KEYS[item.status]) : item.status}</Text>
          </View>
        </View>
      )}
    />
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    list: { padding: 12 },
    empty: { color: c.dim },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },
    row: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    rowLeft: { width: 92 },
    date: { fontWeight: "700", color: c.text },
    rowMid: { flex: 1, paddingHorizontal: 8 },
    time: { color: c.text },
    worked: { color: c.dim, fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  });
}
