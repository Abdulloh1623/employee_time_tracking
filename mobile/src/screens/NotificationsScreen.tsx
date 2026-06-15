import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme, type Colors } from "../theme";
import { useNotifications } from "../notifications/NotificationsContext";

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { items, refresh, markRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function markAll() {
    for (const n of items) if (!n.isRead) await markRead(n.id);
  }

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={items.length === 0 ? styles.center : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        items.some((n) => !n.isRead) ? (
          <Pressable style={styles.markAll} onPress={markAll}>
            <Ionicons name="checkmark-done" size={16} color={colors.brand} />
            <Text style={styles.markAllText}>{t("notif.markAllRead")}</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={40} color={colors.dim} />
          <Text style={styles.empty}>{t("notif.empty")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.row, !item.isRead && styles.rowUnread]} onPress={() => markRead(item.id)}>
          {!item.isRead && <View style={styles.dot} />}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !item.isRead && styles.titleUnread]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.sentAt).toLocaleString()}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: 12 },
    center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    emptyBox: { alignItems: "center", gap: 8 },
    empty: { color: c.dim },
    markAll: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 8, marginBottom: 6 },
    markAllText: { color: c.brand, fontWeight: "700", fontSize: 13 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: c.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    rowUnread: { borderColor: c.brand },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand, marginTop: 6 },
    title: { color: c.text, fontWeight: "600", fontSize: 15 },
    titleUnread: { fontWeight: "800" },
    body: { color: c.dim, fontSize: 13, marginTop: 2 },
    time: { color: c.dim, fontSize: 11, marginTop: 4 },
  });
}
