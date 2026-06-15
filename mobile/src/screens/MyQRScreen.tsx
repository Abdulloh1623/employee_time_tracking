import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTranslation } from "react-i18next";
import { myProfile } from "../api/me";
import { apiErrorMessage } from "../api/client";
import type { Employee } from "../types";
import { useTheme, type Colors } from "../theme";

export default function MyQRScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEmp(await myProfile());
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

  const fullName = emp ? `${emp.lastName} ${emp.firstName}` : "";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
    >
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.name}>{fullName}</Text>
      <Text style={styles.hint}>{t("me.qrHint")}</Text>

      <View style={styles.qrCard}>
        {emp?.qrToken ? (
          <QRCode value={emp.qrToken} size={232} backgroundColor="#ffffff" color="#000000" />
        ) : (
          <Text style={styles.noToken}>{t("me.noQr")}</Text>
        )}
      </View>

      {emp?.qrToken ? <Text style={styles.token}>{emp.qrToken}</Text> : null}
    </ScrollView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: 24, alignItems: "center" },
    name: { fontSize: 22, fontWeight: "800", color: c.text, marginTop: 8, textAlign: "center" },
    hint: { color: c.dim, marginTop: 6, marginBottom: 22, textAlign: "center" },
    qrCard: {
      backgroundColor: "#ffffff", padding: 22, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
      minWidth: 280, minHeight: 280,
    },
    noToken: { color: "#868e96", padding: 40 },
    token: { color: c.dim, marginTop: 18, fontSize: 13, letterSpacing: 1 },
    error: { color: c.red, backgroundColor: c.redLight, padding: 10, borderRadius: 8, marginBottom: 12, alignSelf: "stretch" },
  });
}
