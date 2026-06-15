import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage } from "../api/client";
import { API_BASE_URL, APP_NAME } from "../config";
import { useTheme, type Colors } from "../theme";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signIn } = useAuth();
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(login.trim(), password);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <View style={styles.logo}><Text style={styles.logoText}>🕐</Text></View>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>{t("login.subtitle")}</Text>

        <Text style={styles.label}>{t("login.login")}</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={login}
          onChangeText={setLogin}
          placeholder="admin"
        />
        <Text style={styles.label}>{t("login.password")}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onSubmit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("login.signIn")}</Text>}
        </Pressable>

        <Text style={styles.hint}>{t("login.demo")}</Text>
        <Text style={styles.api}>{API_BASE_URL}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.brand },
    container: { flex: 1, justifyContent: "center", padding: 24 },
    logo: { alignSelf: "center", width: 64, height: 64, borderRadius: 16, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    logoText: { fontSize: 30 },
    title: { textAlign: "center", color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 12 },
    subtitle: { textAlign: "center", color: c.brandLight, marginBottom: 24 },
    label: { color: "#fff", fontWeight: "600", marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text },
    button: { backgroundColor: c.brandDark, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    error: { color: c.redLight, backgroundColor: c.red, padding: 10, borderRadius: 8, marginTop: 12, textAlign: "center" },
    hint: { textAlign: "center", color: c.brandLight, marginTop: 16, fontSize: 12 },
    api: { textAlign: "center", color: c.dim, marginTop: 4, fontSize: 11 },
  });
}
