import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";

type Kind = "success" | "error" | "info";
interface ToastState { message: string; kind: Kind }
interface ToastApi { show: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastApi>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: Kind = "info") => {
    setToast({ message, kind });
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2600);
  }, [opacity]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} />}
    </Ctx.Provider>
  );
}

function ToastView({ toast, opacity }: { toast: ToastState; opacity: Animated.Value }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = toast.kind === "success" ? colors.green : toast.kind === "error" ? colors.red : colors.brandDark;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 28, opacity }]}>
      <Text style={[styles.toast, { backgroundColor: bg }]}>{toast.message}</Text>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  return useContext(Ctx);
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 9999, elevation: 12 },
  toast: {
    color: "#fff", fontWeight: "600", fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, overflow: "hidden",
    textAlign: "center", maxWidth: "100%",
  },
});
