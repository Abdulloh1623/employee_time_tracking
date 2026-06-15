import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { myPayslips } from "../api/me";
import { apiErrorMessage } from "../api/client";
import { formatMoney } from "../format";
import type { Payslip } from "../types";
import { useTheme, type Colors } from "../theme";

const PAYROLL_STATUS_KEYS: Record<string, string> = {
  open: "payroll.statusOpen", calculated: "payroll.statusCalculated",
  closed: "payroll.statusClosed", paid: "payroll.statusPaid",
};
function statusColor(c: Colors, s: string): string {
  return s === "paid" ? c.green : s === "closed" ? c.brand : s === "calculated" ? c.orange : c.dim;
}

export default function MyPayslipsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [slips, setSlips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSlips(await myPayslips());
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
      data={slips}
      keyExtractor={(s) => String(s.payroll.id)}
      contentContainerStyle={slips.length === 0 ? styles.center : styles.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
      ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
      ListEmptyComponent={<Text style={styles.empty}>{t("me.noPayslips")}</Text>}
      renderItem={({ item }) => {
        const r = item.payroll;
        const cur = r.currency;
        return (
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headLeft}>
                <Text style={styles.period}>{item.period.name}</Text>
                <Text style={styles.dates}>{item.period.startDate} – {item.period.endDate}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(colors, r.status) }]}>
                <Text style={styles.badgeText}>
                  {PAYROLL_STATUS_KEYS[r.status] ? t(PAYROLL_STATUS_KEYS[r.status]) : r.status}
                </Text>
              </View>
            </View>

            <View style={styles.netRow}>
              <Text style={styles.netLabel}>{t("payroll.metricNet")}</Text>
              <Text style={styles.netValue}>{formatMoney(r.net, cur)}</Text>
            </View>

            <View style={styles.grid}>
              <Metric styles={styles} label={t("payroll.metricGross")} value={formatMoney(r.gross, cur)} />
              <Metric styles={styles} label={t("payroll.metricBonus")} value={formatMoney(r.totalBonus, cur)} />
              <Metric styles={styles} label={t("payroll.metricFine")} value={formatMoney(r.totalFine, cur)} />
              <Metric styles={styles} label={t("payroll.metricDeduction")} value={formatMoney(r.totalDeduction, cur)} />
            </View>

            <Text style={styles.meta}>
              {t("payroll.metricWorkedHours")}: {Number(r.workedHours).toFixed(1)}
              {r.lateMinutes > 0 ? ` · ${t("payroll.metricLateMinutes")}: ${r.lateMinutes}` : ""}
            </Text>
          </View>
        );
      }}
    />
  );
}

function Metric({ styles, label, value }: { styles: ReturnType<typeof makeStyles>; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    list: { padding: 12 },
    empty: { color: c.dim },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 8 },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headLeft: { flex: 1, paddingRight: 8 },
    period: { fontSize: 16, fontWeight: "800", color: c.text },
    dates: { color: c.dim, fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    netRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 14, marginBottom: 12 },
    netLabel: { color: c.dim, fontWeight: "600" },
    netValue: { color: c.green, fontSize: 22, fontWeight: "800" },
    grid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
    metric: { width: "50%", marginBottom: 10 },
    metricLabel: { color: c.dim, fontSize: 12 },
    metricValue: { color: c.text, fontWeight: "700", marginTop: 2 },
    meta: { color: c.dim, fontSize: 12, marginTop: 2 },
  });
}
