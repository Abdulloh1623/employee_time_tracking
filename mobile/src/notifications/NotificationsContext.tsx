import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listNotifications, markRead as apiMarkRead } from "../api/notifications";
import { ensureNotifPermission, fireLocal } from "./push";
import type { AppNotification } from "../types";

interface NotificationsApi {
  items: AppNotification[];
  unread: number;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
}

const Ctx = createContext<NotificationsApi>({ items: [], unread: 0, refresh: async () => {}, markRead: async () => {} });

const POLL_MS = 25000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const lastMaxId = useRef(0);
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listNotifications();
      const maxId = list.reduce((m, n) => Math.max(m, n.id), 0);
      if (initialized.current) {
        // newly arrived, still-unread notifications -> fire a local notification
        const fresh = list.filter((n) => n.id > lastMaxId.current && !n.isRead);
        for (const n of fresh) await fireLocal(n.title, n.body);
      }
      lastMaxId.current = Math.max(lastMaxId.current, maxId);
      initialized.current = true;
      setItems(list);
    } catch {
      /* network hiccup — keep current items */
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      initialized.current = false;
      lastMaxId.current = 0;
      return;
    }
    ensureNotifPermission();
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [user, refresh]);

  const markRead = useCallback(async (id: number) => {
    try {
      await apiMarkRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      /* ignore */
    }
  }, []);

  const unread = items.filter((n) => !n.isRead).length;

  return <Ctx.Provider value={{ items, unread, refresh, markRead }}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsApi {
  return useContext(Ctx);
}
