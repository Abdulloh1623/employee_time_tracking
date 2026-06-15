import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Switch, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../config";
import { useTheme, type Colors } from "../theme";
import { setLanguage, LANGS } from "../i18n";
import { useToast } from "../components/Toast";
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, authenticate } from "../biometric";
import {
  getTzOverride, setTzOverride, deviceOffsetMin, effectiveOffsetMin,
  offsetLabel, deviceTimeZoneName, OFFSET_CHOICES,
} from "../time";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, scheme, toggle } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentLang = i18n.language;

  const [auto, setAuto] = useState(getTzOverride() == null);
  const [off, setOff] = useState(effectiveOffsetMin());
  const effective = auto ? deviceOffsetMin() : off;
  const tzName = deviceTimeZoneName();

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(isBiometricEnabled());
  useEffect(() => { isBiometricAvailable().then(setBioAvailable); }, []);

  async function onToggleBio(val: boolean) {
    if (val) {
      const ok = await authenticate(t("biometric.prompt"));
      if (!ok) return;
    }
    await setBiometricEnabled(val);
    setBioOn(val);
    toast.show(val ? t("biometric.on") : t("biometric.off"), "success");
  }

  function onToggleAuto(val: boolean) {
    if (val) {
      setTzOverride(null);
      setAuto(true);
      setOff(deviceOffsetMin());
    } else {
      const cur = deviceOffsetMin();
      setTzOverride(cur);
      setAuto(false);
      setOff(cur);
    }
  }
  function onPick(min: number) {
    setTzOverride(min);
    setOff(min);
    setAuto(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user?.login?.[0]?.toUpperCase() ?? "?"}</Text></View>
      <Text style={styles.login}>{user?.login}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <View style={styles.card}>
        <Row label={t("profile.userId")} value={String(user?.id ?? "—")} />
        <Row label={t("profile.employeeId")} value={user?.employeeId ? String(user.employeeId) : "—"} />
        <Row label={t("profile.server")} value={API_BASE_URL} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("profile.language")}</Text>
        <View style={styles.langRow}>
          {LANGS.map((l) => {
            const active = currentLang.startsWith(l.code);
            return (
              <Pressable key={l.code} style={[styles.langButton, active && styles.langButtonActive]} onPress={() => setLanguage(l.code)}>
                <Text style={[styles.langButtonText, active && styles.langButtonTextActive]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.appearanceRow}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{scheme === "dark" ? t("profile.dark") : t("profile.light")}</Text>
            <Switch value={scheme === "dark"} onValueChange={toggle} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.card} />
          </View>
          {bioAvailable && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t("biometric.lock")}</Text>
              <Switch value={bioOn} onValueChange={onToggleBio} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.card} />
            </View>
          )}
        </View>
      </View>

      {/* Timezone */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("tz.title")}</Text>
        <Row label={t("tz.detected")} value={(tzName ? tzName + " · " : "") + offsetLabel(deviceOffsetMin())} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t("tz.auto")}</Text>
          <Switch value={auto} onValueChange={onToggleAuto} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.card} />
        </View>
        {!auto && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offsetRow}>
            {OFFSET_CHOICES.map((m) => {
              const active = m === off;
              return (
                <Pressable key={m} style={[styles.offsetChip, active && styles.offsetChipActive]} onPress={() => onPick(m)}>
                  <Text style={[styles.offsetText, active && styles.offsetTextActive]}>{offsetLabel(m)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <Text style={styles.tzCurrent}>{t("tz.current")}: {offsetLabel(effective)}</Text>
      </View>

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>{t("profile.signOut")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { alignItems: "center", padding: 24, paddingBottom: 40 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", marginTop: 4 },
    avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
    login: { fontSize: 20, fontWeight: "700", marginTop: 12, color: c.text },
    role: { color: c.dim, marginBottom: 20 },
    card: { width: "100%", backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 8, marginBottom: 16 },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    rowLabel: { color: c.dim },
    rowValue: { color: c.text, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 },
    button: { backgroundColor: c.red, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    sectionLabel: { color: c.dim, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 6 },
    langRow: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
    langButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: "center", backgroundColor: c.bg },
    langButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    langButtonText: { color: c.dim, fontWeight: "600", fontSize: 13 },
    langButtonTextActive: { color: c.brand },
    appearanceRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginTop: 4, paddingTop: 4 },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8 },
    switchLabel: { color: c.text, fontWeight: "600" },
    offsetRow: { paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
    offsetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, marginRight: 8 },
    offsetChipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    offsetText: { color: c.dim, fontWeight: "600", fontSize: 13 },
    offsetTextActive: { color: c.brand },
    tzCurrent: { color: c.dim, fontSize: 12, paddingHorizontal: 8, paddingTop: 2 },
  });
}
