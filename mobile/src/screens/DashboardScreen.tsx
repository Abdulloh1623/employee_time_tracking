import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  Pressable, Modal, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { listEmployees } from "../api/employees";
import { listAttendance, type AttendanceRow } from "../api/attendance";
import { listLeaveRequests } from "../api/leave";
import { apiErrorMessage } from "../api/client";
import { iso, fmtTime } from "../format";
import { useTheme, type Colors } from "../theme";
import type { Employee, LeaveRequest } from "../types";

type CardKey = "totalEmployees" | "present" | "late" | "pendingLeave";

interface CardDef {
  key: CardKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  grad: readonly [string, string];
}

const CARDS: CardDef[] = [
  { key: "totalEmployees", labelKey: "dashboard.totalEmployees", icon: "people", grad: ["#1971c2", "#22b8cf"] },
  { key: "present", labelKey: "dashboard.presentToday", icon: "checkmark-circle", grad: ["#2f9e44", "#51cf66"] },
  { key: "late", labelKey: "dashboard.late", icon: "time", grad: ["#e8590c", "#fab005"] },
  { key: "pendingLeave", labelKey: "dashboard.pendingLeave", icon: "calendar", grad: ["#9c36b5", "#f06595"] },
];

function Ring({ value, total, colors }: { value: number; total: number; colors: Colors }) {
  const size = 128, stroke = 13, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const dash = circ * pct;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1971c2" />
          <Stop offset="1" stopColor="#2f9e44" />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<CardKey | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const today = iso(new Date());
      const [emps, att, lv] = await Promise.all([
        listEmployees({ perPage: 200 }),
        listAttendance(today, today),
        listLeaveRequests({ status: "pending" }),
      ]);
      setEmployees(emps.data);
      setTotal(emps.total);
      setAttendance(att);
      setLeave(lv);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (err) {
      if (!silent) setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // initial load + live polling (refreshes metrics so a checker's scan shows up)
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const names = useMemo(() => {
    const m = new Map<number, string>();
    employees.forEach((e) => m.set(e.id, `${e.lastName} ${e.firstName}`));
    return m;
  }, [employees]);
  const empName = (id: number) => names.get(id) ?? `#${id}`;

  const present = useMemo(() => attendance.filter((r) => r.checkInAt != null), [attendance]);
  const late = useMemo(() => attendance.filter((r) => r.lateMinutes > 0), [attendance]);

  const counts: Record<CardKey, number> = {
    totalEmployees: total,
    present: present.length,
    late: late.length,
    pendingLeave: leave.length,
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /></View>;
  }

  function renderDetail() {
    if (active === "totalEmployees") {
      return (
        <FlatList
          data={employees}
          keyExtractor={(e) => String(e.id)}
          ListEmptyComponent={<Empty t={t} styles={styles} />}
          renderItem={({ item }) => (
            <View style={styles.detailRow}>
              <Text style={styles.detailName}>{item.lastName} {item.firstName}</Text>
              <Text style={[styles.detailMeta, { color: item.status === "active" ? colors.green : colors.dim }]}>
                {item.status === "active" ? t("common.active") : t("common.inactive")}
              </Text>
            </View>
          )}
        />
      );
    }
    if (active === "present") {
      return (
        <FlatList
          data={present}
          keyExtractor={(r) => String(r.id)}
          ListEmptyComponent={<Empty t={t} styles={styles} />}
          renderItem={({ item }) => (
            <View style={styles.detailRow}>
              <Text style={styles.detailName}>{empName(item.employeeId)}</Text>
              <Text style={[styles.detailMeta, { color: colors.green }]}>{fmtTime(item.checkInAt)}</Text>
            </View>
          )}
        />
      );
    }
    if (active === "late") {
      return (
        <FlatList
          data={late}
          keyExtractor={(r) => String(r.id)}
          ListEmptyComponent={<Empty t={t} styles={styles} />}
          renderItem={({ item }) => (
            <View style={styles.detailRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{empName(item.employeeId)}</Text>
                <Text style={styles.detailSub}>{fmtTime(item.checkInAt)}</Text>
              </View>
              <Text style={[styles.detailMeta, { color: colors.orange }]}>{t("scan.late", { n: item.lateMinutes })}</Text>
            </View>
          )}
        />
      );
    }
    return (
      <FlatList
        data={leave}
        keyExtractor={(l) => String(l.id)}
        ListEmptyComponent={<Empty t={t} styles={styles} />}
        renderItem={({ item }) => (
          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailName}>{item.employeeName}</Text>
              <Text style={styles.detailSub}>{item.leaveTypeName} · {item.dateFrom} → {item.dateTo}</Text>
            </View>
            <Text style={[styles.detailMeta, { color: colors.grape }]}>{t("leave.days", { n: item.days })}</Text>
          </View>
        )}
      />
    );
  }

  const activeCard = CARDS.find((c) => c.key === active);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{t("dashboard.title")}</Text>
          <Text style={styles.subheading}>{t("dashboard.subtitle")}</Text>
        </View>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Hero: today's attendance ring */}
      <View style={[styles.hero, styles.shadow]}>
        <View style={styles.ringWrap}>
          <Ring value={present.length} total={total} colors={colors} />
          <View style={styles.ringCenter}>
            <Text style={styles.ringValue}>{present.length}/{total}</Text>
            <Text style={styles.ringSub}>{t("dashboard.presentToday")}</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <HeroStat color={colors.green} label={t("dashboard.presentToday")} value={present.length} styles={styles} />
          <HeroStat color={colors.orange} label={t("dashboard.late")} value={late.length} styles={styles} />
          <HeroStat color={colors.grape} label={t("dashboard.pendingLeave")} value={leave.length} styles={styles} />
          {updatedAt ? <Text style={styles.updated}>{updatedAt}</Text> : null}
        </View>
      </View>

      <View style={styles.grid}>
        {CARDS.map((card) => (
          <Pressable
            key={card.key}
            style={[styles.card, styles.shadow]}
            onPress={() => setActive(card.key)}
            android_ripple={{ color: colors.border }}
          >
            <LinearGradient colors={card.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
              <Ionicons name={card.icon} size={22} color="#fff" />
            </LinearGradient>
            <Text style={styles.value}>{counts[card.key]}</Text>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t(card.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.dim} />
            </View>
          </Pressable>
        ))}
      </View>

      <Modal visible={active != null} animationType="slide" onRequestClose={() => setActive(null)} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{activeCard ? t(activeCard.labelKey) : ""}</Text>
                <Text style={styles.modalCount}>{active ? counts[active] : 0}</Text>
              </View>
              <Pressable onPress={() => setActive(null)} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>{active && renderDetail()}</View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function HeroStat({ color, label, value, styles }: {
  color: string; label: string; value: number; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.heroStatRow}>
      <View style={[styles.heroDot, { backgroundColor: color }]} />
      <Text style={styles.heroStatLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

function Empty({ t, styles }: { t: (k: string) => string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.empty}>{t("common.noData")}</Text>;
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
    container: { padding: 16 },
    shadow: {
      shadowColor: "#1b2a4a", shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
    },
    titleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
    heading: { fontSize: 22, fontWeight: "800", color: c.text },
    subheading: { fontSize: 14, color: c.dim, marginTop: 2 },
    liveChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.greenLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.green },
    liveText: { fontSize: 11, fontWeight: "800", color: c.green, letterSpacing: 0.5 },
    errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.redLight, borderWidth: 1, borderColor: c.red, borderRadius: 10, padding: 10, marginBottom: 14 },
    errorText: { color: c.red, flex: 1, fontSize: 13 },

    hero: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: c.border },
    ringWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
    ringCenter: { position: "absolute", alignItems: "center" },
    ringValue: { fontSize: 24, fontWeight: "800", color: c.text },
    ringSub: { fontSize: 11, color: c.dim, marginTop: 2 },
    heroStats: { flex: 1, paddingLeft: 18 },
    heroStatRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    heroDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    heroStatLabel: { flex: 1, fontSize: 13, color: c.dim },
    heroStatValue: { fontSize: 16, fontWeight: "800", color: c.text },
    updated: { fontSize: 11, color: c.dim, marginTop: 2 },

    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    card: { width: "48%", backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: c.border },
    badge: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    value: { fontSize: 30, fontWeight: "800", color: c.text },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
    label: { fontSize: 13, color: c.dim, flex: 1 },

    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "80%", paddingBottom: 8 },
    modalHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    modalTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    modalCount: { fontSize: 26, fontWeight: "800", color: c.brand, marginTop: 2 },
    closeBtn: { padding: 4 },
    modalBody: { paddingHorizontal: 12, paddingTop: 8 },
    detailRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    detailName: { fontSize: 15, fontWeight: "600", color: c.text, flex: 1 },
    detailSub: { fontSize: 12, color: c.dim, marginTop: 2 },
    detailMeta: { fontSize: 13, fontWeight: "700", marginLeft: 10 },
    empty: { color: c.dim, textAlign: "center", paddingVertical: 24 },
  });
}
