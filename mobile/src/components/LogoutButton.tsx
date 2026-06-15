import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";

export default function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={10} style={{ paddingHorizontal: 12 }}>
      <Ionicons name="log-out-outline" size={22} color="#fff" />
    </Pressable>
  );
}
