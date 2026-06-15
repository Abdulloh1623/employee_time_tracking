import React, { useEffect } from "react";
import { DeviceEventEmitter } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import "./src/i18n";
import { AuthProvider } from "./src/auth/AuthContext";
import { ThemeProvider, useTheme } from "./src/theme";
import { ToastProvider, useToast } from "./src/components/Toast";
import { NotificationsProvider } from "./src/notifications/NotificationsContext";
import BiometricGate from "./src/components/BiometricGate";
import { loadTzOverride } from "./src/time";
import { loadBiometric } from "./src/biometric";
import { AUTH_EXPIRED } from "./src/api/client";
import RootNavigator from "./src/navigation/RootNavigator";

function NavWrapper() {
  const { scheme, colors } = useTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.card,
      primary: colors.brand,
      text: colors.text,
      border: colors.border,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

function SessionWatcher() {
  const { show } = useToast();
  const { t } = useTranslation();
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_EXPIRED, () => show(t("session.expired"), "error"));
    return () => sub.remove();
  }, [show, t]);
  return null;
}

export default function App() {
  useEffect(() => { loadTzOverride(); loadBiometric(); }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SessionWatcher />
            <NotificationsProvider>
              <BiometricGate>
                <NavWrapper />
              </BiometricGate>
            </NotificationsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
