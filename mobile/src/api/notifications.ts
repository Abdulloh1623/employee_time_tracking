import { api } from "./client";
import type { AppNotification } from "../types";

export async function listNotifications(): Promise<AppNotification[]> {
  const res = await api.get<AppNotification[]>("/notifications");
  return res.data;
}

export async function unreadCount(): Promise<number> {
  const res = await api.get<{ unread: number }>("/notifications/unread-count");
  return res.data.unread;
}

export async function markRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}
