import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme";
import { setLanguage, LANGS } from "../i18n";

export default function HeaderControls() {
  const { scheme, toggle } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language || "uz";
  const cur = LANGS.find((l) => lang.startsWith(l.code)) ?? LANGS[0];

  const nextLang = () => {
    const idx = LANGS.findIndex((l) => lang.startsWith(l.code));
    const next = LANGS[(idx + 1) % LANGS.length];
    setLanguage(next.code);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={nextLang} hitSlop={8} style={styles.langBtn}>
        <Ionicons name="language-outline" size={15} color="#fff" />
        <Text style={styles.langText}>{cur.code.toUpperCase()}</Text>
      </Pressable>
      <Pressable onPress={toggle} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name={scheme === "dark" ? "sunny-outline" : "moon-outline"} size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  langBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4 },
  langText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  iconBtn: { paddingHorizontal: 6 },
});
