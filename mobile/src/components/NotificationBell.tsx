import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useNotifications } from "../notifications/NotificationsContext";

export default function NotificationBell() {
  const { unread } = useNotifications();
  const nav = useNavigation<{ navigate: (r: string) => void }>();
  return (
    <Pressable onPress={() => nav.navigate("Bildirishnomalar")} hitSlop={8} style={styles.btn}>
      <Ionicons name="notifications-outline" size={22} color="#fff" />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 8 },
  badge: {
    position: "absolute", top: -2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: "#fa5252", alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
