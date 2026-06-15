import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell, Burger, Group, NavLink, ScrollArea, Text, ThemeIcon, ActionIcon,
  Menu, Avatar, useMantineColorScheme, useComputedColorScheme, Tooltip, Box, Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconLayoutDashboard, IconUsers, IconCalendarTime, IconCash, IconBeach,
  IconReportAnalytics, IconSun, IconMoon, IconLogout, IconClockHour4, IconChevronDown,
  IconCalendarClock, IconHistory, IconKey, IconWorld, IconCoin, IconScan, IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { LANGUAGES } from "../i18n";
import NotificationMenu from "./NotificationMenu";
import ChangePasswordModal from "./ChangePasswordModal";
import ErrorBoundary from "./ErrorBoundary";

const NAV = [
  { to: "/", key: "nav.dashboard", icon: IconLayoutDashboard, adminOnly: false },
  { to: "/employees", key: "nav.employees", icon: IconUsers, adminOnly: false },
  { to: "/shifts", key: "nav.shifts", icon: IconCalendarClock, adminOnly: false },
  { to: "/attendance", key: "nav.attendance", icon: IconCalendarTime, adminOnly: false },
  { to: "/kiosk", key: "nav.kiosk", icon: IconScan, adminOnly: false },
  { to: "/payroll", key: "nav.payroll", icon: IconCash, adminOnly: false },
  { to: "/salaries", key: "nav.salaries", icon: IconCoin, adminOnly: false },
  { to: "/leave", key: "nav.leave", icon: IconBeach, adminOnly: false },
  { to: "/reports", key: "nav.reports", icon: IconReportAnalytics, adminOnly: false },
  { to: "/settings", key: "nav.settings", icon: IconSettings, adminOnly: true },
  { to: "/audit", key: "nav.audit", icon: IconHistory, adminOnly: true },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const [opened, { toggle, close }] = useDisclosure();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const [pwOpen, setPwOpen] = useState(false);

  function logout() {
    signOut();
    navigate("/login");
  }

  const visibleNav = NAV.filter((n) => !n.adminOnly || user?.role === "super_admin");
  const currentLang = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage)?.label ?? "O'zbekcha";

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: "brand.6", to: "brand.9" }}>
              <IconClockHour4 size={20} />
            </ThemeIcon>
            <Text fw={700} size="lg" visibleFrom="xs">TimeGate</Text>
          </Group>

          <Group gap="xs">
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>
                <Button variant="default" size="xs" leftSection={<IconWorld size={15} />} rightSection={<IconChevronDown size={12} />}>
                  {currentLang}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {LANGUAGES.map((l) => (
                  <Menu.Item key={l.code} onClick={() => i18n.changeLanguage(l.code)}
                    fw={i18n.resolvedLanguage === l.code ? 700 : 400}>
                    {l.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <Tooltip label={computed === "dark" ? "Light" : "Dark"}>
              <ActionIcon variant="default" size="lg"
                onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}>
                {computed === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
              </ActionIcon>
            </Tooltip>

            <NotificationMenu />

            <Menu shadow="md" width={210} position="bottom-end">
              <Menu.Target>
                <Group gap={6} style={{ cursor: "pointer" }}>
                  <Avatar color="brand" radius="xl" size={32}>{user?.login?.[0]?.toUpperCase()}</Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={600} lh={1}>{user?.login}</Text>
                    <Text size="xs" c="dimmed">{user?.role}</Text>
                  </Box>
                  <IconChevronDown size={14} />
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.login} · {user?.role}</Menu.Label>
                <Menu.Item leftSection={<IconKey size={16} />} onClick={() => setPwOpen(true)}>
                  {t("auth.changePassword")}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={logout}>
                  {t("auth.signOut")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          {visibleNav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                label={t(item.key)}
                leftSection={<item.icon size={20} stroke={1.6} />}
                active={active}
                onClick={close}
                mb={4}
                style={{ borderRadius: 8 }}
              />
            );
          })}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </AppShell.Main>

      <ChangePasswordModal opened={pwOpen} onClose={() => setPwOpen(false)} />
    </AppShell>
  );
}
