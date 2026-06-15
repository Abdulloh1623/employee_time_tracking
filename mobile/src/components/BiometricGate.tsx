import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme";
import { isBiometricEnabled, authenticate } from "../biometric";

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [locked, setLocked] = useState(false);
  const promptingRef = useRef(false);
  const lastBg = useRef(0);

  const tryUnlock = useCallback(async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    const ok = await authenticate(t("biometric.prompt"));
    promptingRef.current = false;
    if (ok) setLocked(false);
  }, [t]);

  // Lock when a session exists and biometric lock is enabled.
  useEffect(() => {
    if (user && isBiometricEnabled()) setLocked(true);
    else setLocked(false);
  }, [user]);

  // Re-lock when returning from background (ignore the brief prompt blur).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" || s === "inactive") lastBg.current = Date.now();
      if (s === "active" && user && isBiometricEnabled() && Date.now() - lastBg.current > 1500) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [user]);

  useEffect(() => {
    if (locked) tryUnlock();
  }, [locked, tryUnlock]);

  return (
    <View style={styles.flex}>
      {children}
      {locked && (
        <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
          <Ionicons name="lock-closed" size={56} color={colors.brand} />
          <Text style={[styles.title, { color: colors.text }]}>{t("biometric.locked")}</Text>
          <Pressable style={[styles.button, { backgroundColor: colors.brand }]} onPress={tryUnlock}>
            <Ionicons name="finger-print" size={20} color="#fff" />
            <Text style={styles.buttonText}>{t("biometric.unlock")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center", gap: 16, zIndex: 10000,
  },
  title: { fontSize: 18, fontWeight: "700" },
  button: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
