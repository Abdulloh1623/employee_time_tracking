import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Colors {
  brand: string; brandDark: string; brandLight: string;
  bg: string; card: string; border: string;
  text: string; dim: string;
  green: string; greenLight: string;
  red: string; redLight: string;
  orange: string; yellowLight: string; grape: string;
}

const light: Colors = {
  brand: "#1971c2", brandDark: "#0b4a8f", brandLight: "#e7f5ff",
  bg: "#f1f3f5", card: "#ffffff", border: "#e9ecef",
  text: "#212529", dim: "#868e96",
  green: "#2b8a3e", greenLight: "#ebfbee",
  red: "#c92a2a", redLight: "#fff5f5",
  orange: "#e67700", yellowLight: "#fff9db", grape: "#9c36b5",
};

const dark: Colors = {
  brand: "#4dabf7", brandDark: "#1971c2", brandLight: "#1c2a3a",
  bg: "#16181c", card: "#1f2227", border: "#2c2e33",
  text: "#e9ecef", dim: "#909296",
  green: "#51cf66", greenLight: "#16241a",
  red: "#ff6b6b", redLight: "#2a1818",
  orange: "#ffa94d", yellowLight: "#2a2616", grape: "#da77f2",
};

/** Static light palette — fallback for non-component modules. Prefer useTheme() in screens. */
export const C = light;

export type Scheme = "light" | "dark";
interface ThemeState { colors: Colors; scheme: Scheme; toggle: () => void }

const ThemeCtx = createContext<ThemeState>({ colors: light, scheme: "light", toggle: () => {} });
const KEY = "tg_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>("light");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "dark" || v === "light") setScheme(v);
    });
  }, []);

  const toggle = () => {
    setScheme((s) => {
      const next: Scheme = s === "light" ? "dark" : "light";
      AsyncStorage.setItem(KEY, next);
      return next;
    });
  };

  const colors = scheme === "dark" ? dark : light;
  return <ThemeCtx.Provider value={{ colors, scheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeCtx);
}
