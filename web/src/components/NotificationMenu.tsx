import { useEffect, useState } from "react";
import {
  ActionIcon, Indicator, Menu, Text, ScrollArea, Stack, Group, Badge, Center,
} from "@mantine/core";
import { IconBell, IconBellOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { listNotifications, unreadCount, markRead } from "../api/notifications";
import type { AppNotification } from "../types";

export default function NotificationMenu() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);

  async function refreshCount() {
    try { setCount(await unreadCount()); } catch { /* ignore */ }
  }

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    return () => clearInterval(t);
  }, []);

  async function onOpen() {
    try { setItems(await listNotifications()); } catch { /* ignore */ }
  }

  async function onItemClick(n: AppNotification) {
    if (n.isRead) return;
    try {
      await markRead(n.id);
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      refreshCount();
    } catch { /* ignore */ }
  }

  return (
    <Menu shadow="md" width={340} position="bottom-end" onOpen={onOpen} withinPortal>
      <Menu.Target>
        <Indicator label={count > 9 ? "9+" : count} size={16} disabled={count === 0} color="red" offset={4}>
          <ActionIcon variant="default" size="lg" aria-label="Bildirishnomalar">
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("notif.title")}</Menu.Label>
        <ScrollArea.Autosize mah={360}>
          {items.length === 0 ? (
            <Center py="lg">
              <Stack gap={4} align="center">
                <IconBellOff size={26} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">{t("notif.empty")}</Text>
              </Stack>
            </Center>
          ) : (
            items.map((n) => (
              <Menu.Item key={n.id} onClick={() => onItemClick(n)} style={{ whiteSpace: "normal" }}>
                <Group justify="space-between" wrap="nowrap" mb={2}>
                  <Text size="sm" fw={n.isRead ? 400 : 700} lineClamp={1}>{n.title}</Text>
                  {!n.isRead && <Badge size="xs" color="brand" variant="filled">{t("notif.new")}</Badge>}
                </Group>
                <Text size="xs" c="dimmed" lineClamp={2}>{n.body}</Text>
                <Text size="xs" c="dimmed" mt={2}>{new Date(n.sentAt).toLocaleString()}</Text>
              </Menu.Item>
            ))
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
