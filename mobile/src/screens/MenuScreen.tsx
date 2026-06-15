import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme, type Colors } from "../theme";

export default function MenuScreen({ navigation }: { navigation: { navigate: (r: string) => void } }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const items: { route: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { route: "Sozlamalar", label: t("menu.settings"), icon: "settings-outline", color: colors.brand },
    { route: "Davomat", label: t("menu.attendance"), icon: "list-outline", color: colors.green },
    { route: "Profil", label: t("menu.profile"), icon: "person-outline", color: colors.grape },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {items.map((it) => (
        <Pressable key={it.route} style={styles.row} onPress={() => navigation.navigate(it.route)}>
          <View style={[styles.icon, { backgroundColor: it.color }]}>
            <Ionicons name={it.icon} size={20} color="#fff" />
          </View>
          <Text style={styles.label}>{it.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.dim} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { padding: 12 },
    row: { flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    icon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
    label: { flex: 1, fontSize: 16, fontWeight: "600", color: c.text },
  });
}
