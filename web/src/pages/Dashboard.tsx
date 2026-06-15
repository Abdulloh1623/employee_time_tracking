import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SimpleGrid, Card, Group, Text, ThemeIcon, Title, Skeleton, Paper, Stack, Center, Badge,
  useComputedColorScheme,
} from "@mantine/core";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useTranslation } from "react-i18next";
import {
  IconUsers, IconUserCheck, IconClockExclamation, IconBeach,
} from "@tabler/icons-react";
import { listEmployees, listDepartments } from "../api/employees";
import { listLeaveRequests } from "../api/leave";
import { listPeriods, listPayrolls } from "../api/payroll";
import { api } from "../api/client";
import { formatMoney } from "../utils/format";

interface AttRow { employeeId: number; workDate: string; checkInAt: string | null; status: string; }
function iso(d: Date) { return d.toISOString().slice(0, 10); }

// How often the live metrics refresh (ms). Attendance scans appear within this window.
const POLL_MS = 10000;

const PAL = {
  teal: "#12b886", tealLt: "#63e6be",
  amber: "#f59f00", amberLt: "#ffd43b",
  red: "#fa5252", redLt: "#ff8787",
  blue: "#1971c2", blueLt: "#4dabf7",
  green: "#2f9e44", greenLt: "#69db7c",
};

function StatCard({ icon: Icon, label, value, from, to }: {
  icon: typeof IconUsers; label: string; value: number | string; from: string; to: string;
}) {
  return (
    <Card withBorder padding="lg" radius="lg" shadow="sm" className="tg-stat">
      <Group>
        <ThemeIcon size={54} radius="md" variant="gradient" gradient={{ from, to, deg: 135 }}
          style={{ boxShadow: `0 8px 18px var(--mantine-color-${from}-light)` }}>
          <Icon size={27} />
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.5}>{label}</Text>
          <Text fw={800} fz={32} lh={1.05}>{value}</Text>
        </div>
      </Group>
    </Card>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const scheme = useComputedColorScheme("light");
  const dark = scheme === "dark";
  const fg = dark ? "#c1c2c5" : "#495057";
  const dim = dark ? "#909296" : "#868e96";
  const grid = dark ? "#2c2e33" : "#eef1f4";
  const cardBg = dark ? "#1f2227" : "#ffffff";

  const [loading, setLoading] = useState(true);
  const [empTotal, setEmpTotal] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [today, setToday] = useState({ came: 0, late: 0, present: 0, absent: 0 });
  const [trend, setTrend] = useState<{ date: string; came: number }[]>([]);
  const [deptPay, setDeptPay] = useState<{ dept: string; net: number }[]>([]);
  const [currency, setCurrency] = useState("UZS");
  const [updatedAt, setUpdatedAt] = useState("");

  const loadLive = useCallback(async () => {
    const now = new Date();
    const todayStr = iso(now);
    const weekAgo = iso(new Date(now.getTime() - 6 * 86400000));
    const [emp, att, pending] = await Promise.all([
      listEmployees({ page: 1, perPage: 200 }),
      api.get<AttRow[]>("/attendance", { params: { dateFrom: weekAgo, dateTo: todayStr } }),
      listLeaveRequests({ status: "pending" }),
    ]);
    const total = emp.total;
    setEmpTotal(total);
    setPendingLeave(pending.length);
    const rows = att.data;
    const todayRows = rows.filter((r) => r.workDate === todayStr);
    const came = todayRows.filter((r) => r.checkInAt).length;
    const late = todayRows.filter((r) => r.status === "late").length;
    const present = todayRows.filter((r) => r.status === "present").length;
    setToday({ came, late, present, absent: Math.max(0, total - came) });
    const days: { date: string; came: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = iso(new Date(now.getTime() - i * 86400000));
      days.push({ date: d.slice(5), came: rows.filter((r) => r.workDate === d && r.checkInAt).length });
    }
    setTrend(days);
    setUpdatedAt(now.toLocaleTimeString());
  }, []);

  const loadPayroll = useCallback(async () => {
    const [emp, depts, periods] = await Promise.all([
      listEmployees({ page: 1, perPage: 200 }),
      listDepartments(),
      listPeriods(),
    ]);
    if (!periods.length) return;
    const payrolls = await listPayrolls(periods[0].id);
    if (!payrolls.length) return;
    setCurrency(payrolls[0].currency);
    const deptOf = new Map(emp.data.map((e) => [e.id, e.departmentId]));
    const nameOf = new Map(depts.map((d) => [d.id, d.name]));
    const sums = new Map<string, number>();
    payrolls.forEach((p) => {
      const name = nameOf.get(deptOf.get(p.employeeId) ?? -1) ?? "—";
      sums.set(name, (sums.get(name) ?? 0) + p.net);
    });
    setDeptPay([...sums.entries()].map(([dept, net]) => ({ dept, net })));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await Promise.all([loadLive(), loadPayroll()]); }
      finally { if (alive) setLoading(false); }
    })();
    const id = setInterval(() => { loadLive().catch(() => {}); }, POLL_MS);
    const onFocus = () => { loadLive().catch(() => {}); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadLive, loadPayroll]);

  // ---- modern, dimensional charts (gradient fills + drop shadows) ----
  const donutOpts: ApexOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "inherit", foreColor: fg,
      dropShadow: { enabled: true, top: 4, left: 0, blur: 8, opacity: 0.18 },
      animations: { enabled: true, speed: 500 } },
    labels: [t("dashboard.onTime"), t("dashboard.late"), t("dashboard.absent")],
    colors: [PAL.teal, PAL.amber, PAL.red],
    fill: { type: "gradient", gradient: { shade: dark ? "dark" : "light", type: "vertical",
      shadeIntensity: 0.5, gradientToColors: [PAL.tealLt, PAL.amberLt, PAL.redLt],
      inverseColors: false, opacityFrom: 1, opacityTo: 0.92, stops: [0, 100] } },
    stroke: { width: 3, colors: [cardBg] },
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontSize: "13px", labels: { colors: fg },
      markers: { size: 6 }, itemMargin: { horizontal: 10 } },
    plotOptions: { pie: { donut: { size: "72%", labels: { show: true,
      name: { show: true, fontSize: "13px", color: dim, offsetY: 20 },
      value: { show: true, fontSize: "26px", fontWeight: 800, color: fg, offsetY: -16 },
      total: { show: true, showAlways: true, label: t("dashboard.presentToday"),
        fontSize: "13px", color: dim, formatter: () => `${today.came}/${empTotal}` } } } } },
    states: { hover: { filter: { type: "lighten", value: 0.06 } } },
    tooltip: { theme: scheme, fillSeriesColor: false },
  }), [t, dark, fg, dim, cardBg, scheme, today.came, empTotal]);

  const barOpts: ApexOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "inherit", foreColor: fg, toolbar: { show: false },
      dropShadow: { enabled: true, top: 5, left: 0, blur: 5, opacity: 0.18 },
      animations: { enabled: true, speed: 500 } },
    colors: [PAL.blue],
    plotOptions: { bar: { borderRadius: 8, borderRadiusApplication: "end", columnWidth: "48%" } },
    fill: { type: "gradient", gradient: { shade: "dark", type: "vertical", shadeIntensity: 0.35,
      gradientToColors: [PAL.blueLt], inverseColors: false, opacityFrom: 1, opacityTo: 0.85, stops: [0, 100] } },
    dataLabels: { enabled: false },
    xaxis: { categories: trend.map((d) => d.date), axisBorder: { show: false }, axisTicks: { show: false },
      labels: { rotate: -45, rotateAlways: false, hideOverlappingLabels: true,
        style: { fontSize: "11px", colors: dim } } },
    yaxis: { labels: { formatter: (v) => String(Math.round(v)), style: { colors: dim } }, min: 0,
      forceNiceScale: true },
    grid: { borderColor: grid, strokeDashArray: 5, xaxis: { lines: { show: false } } },
    tooltip: { theme: scheme },
  }), [fg, dim, grid, scheme, trend]);

  const payOpts: ApexOptions = useMemo(() => ({
    chart: { type: "bar", fontFamily: "inherit", foreColor: fg, toolbar: { show: false },
      dropShadow: { enabled: true, top: 3, left: 0, blur: 5, opacity: 0.15 },
      animations: { enabled: true, speed: 500 } },
    colors: [PAL.teal],
    plotOptions: { bar: { horizontal: true, borderRadius: 6, borderRadiusApplication: "end", barHeight: "58%" } },
    fill: { type: "gradient", gradient: { shade: "dark", type: "horizontal", shadeIntensity: 0.3,
      gradientToColors: [PAL.greenLt], inverseColors: false, opacityFrom: 1, opacityTo: 0.9, stops: [0, 100] } },
    dataLabels: { enabled: true, formatter: (v) => formatMoney(Number(v), currency),
      style: { fontSize: "11px", fontWeight: 600, colors: [dark ? "#fff" : "#fff"] }, offsetX: -2 },
    xaxis: { categories: deptPay.map((d) => d.dept),
      labels: { formatter: (v) => formatMoney(Number(v), currency), style: { colors: dim } } },
    yaxis: { labels: { style: { colors: fg } } },
    grid: { borderColor: grid, strokeDashArray: 5 },
    tooltip: { theme: scheme, y: { formatter: (v) => formatMoney(v, currency) } },
  }), [fg, dim, grid, scheme, dark, deptPay, currency]);

  const hasEmp = empTotal > 0;

  return (
    <Stack gap="lg">
      <style>{`
        .tg-stat, .tg-card { transition: transform .16s ease, box-shadow .16s ease; }
        .tg-stat:hover, .tg-card:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(20,40,80,.14); }
      `}</style>

      <Group justify="space-between" align="center">
        <Title order={2}>{t("dashboard.title")}</Title>
        {!loading && (
          <Group gap="xs">
            <Badge color="teal" variant="dot" size="sm">LIVE</Badge>
            {updatedAt && <Text size="xs" c="dimmed">{updatedAt}</Text>}
          </Group>
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={98} radius="lg" />)
        ) : (
          <>
            <StatCard icon={IconUsers} from="blue" to="cyan" label={t("dashboard.totalEmployees")} value={empTotal} />
            <StatCard icon={IconUserCheck} from="teal" to="green" label={t("dashboard.presentToday")} value={today.came} />
            <StatCard icon={IconClockExclamation} from="orange" to="yellow" label={t("dashboard.lateToday")} value={today.late} />
            <StatCard icon={IconBeach} from="grape" to="pink" label={t("dashboard.pendingLeave")} value={pendingLeave} />
          </>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p="lg" radius="lg" shadow="sm" className="tg-card">
          <Text fw={700} mb="md">{t("dashboard.todayStatus")}</Text>
          {loading ? <Skeleton height={260} circle mx="auto" /> : hasEmp ? (
            <ReactApexChart options={donutOpts} series={[today.present, today.late, today.absent]} type="donut" height={270} />
          ) : <Center h={260}><Text c="dimmed" size="sm">{t("dashboard.noToday")}</Text></Center>}
        </Paper>

        <Paper withBorder p="lg" radius="lg" shadow="sm" className="tg-card">
          <Text fw={700} mb="md">{t("dashboard.last7days")}</Text>
          {loading ? <Skeleton height={260} radius="md" /> : (
            <ReactApexChart options={barOpts}
              series={[{ name: t("dashboard.presentToday"), data: trend.map((d) => d.came) }]}
              type="bar" height={270} />
          )}
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="lg" radius="lg" shadow="sm" className="tg-card">
        <Text fw={700} mb="md">{t("dashboard.payrollByDept")}</Text>
        {loading ? <Skeleton height={260} radius="md" /> : deptPay.length ? (
          <ReactApexChart options={payOpts}
            series={[{ name: t("payroll.net"), data: deptPay.map((d) => d.net) }]}
            type="bar" height={Math.max(220, deptPay.length * 56)} />
        ) : <Center h={240}><Text c="dimmed" size="sm">{t("dashboard.noPayroll")}</Text></Center>}
      </Paper>
    </Stack>
  );
}
