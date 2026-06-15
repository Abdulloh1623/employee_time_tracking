import { useEffect, useRef, useState } from "react";
import {
  Stack, Title, Text, Card, Group, ThemeIcon, Badge, TextInput, Button, Box, Alert, Divider,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  IconScan, IconLogin2, IconLogout2, IconAlertTriangle, IconClock, IconCameraOff,
} from "@tabler/icons-react";
import { Html5Qrcode } from "html5-qrcode";
import { scanQr, kioskDeviceId } from "../api/attendance";
import { apiErrorMessage } from "../api/client";
import type { ScanResult } from "../types";

type Feedback =
  | { kind: "ok"; result: ScanResult }
  | { kind: "error"; message: string };

const READER_ID = "tg-kiosk-reader";
const RESULT_MS = 3800;

export default function Kiosk() {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const processingRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resetTimer = useRef<number | null>(null);

  // live clock
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function handleToken(token: string) {
    const value = token.trim();
    if (!value || processingRef.current) return;
    processingRef.current = true;
    setBusy(true);
    try {
      const result = await scanQr(value, kioskDeviceId());
      setFeedback({ kind: "ok", result });
    } catch (err) {
      setFeedback({ kind: "error", message: apiErrorMessage(err) });
    } finally {
      setBusy(false);
      setManual("");
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => {
        setFeedback(null);
        processingRef.current = false;
      }, RESULT_MS);
    }
  }

  // camera lifecycle — never let a missing/blocked camera crash the page
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("unavailable");
      return;
    }
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;
    try {
      scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => { void handleToken(decoded); },
          () => { /* per-frame decode misses — ignore */ }
        )
        .catch((e) => { if (!cancelled) setCameraError(String(e?.message ?? e)); });
    } catch (e) {
      setCameraError(String((e as Error)?.message ?? e));
    }
    return () => {
      cancelled = true;
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      const inst = scannerRef.current;
      if (inst) {
        try {
          if (inst.isScanning) inst.stop().then(() => inst.clear()).catch(() => {});
          else inst.clear();
        } catch { /* ignore teardown races */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const today = now.toLocaleDateString();

  return (
    <Stack gap="md" align="center">
      <Group justify="space-between" w="100%" maw={560}>
        <Title order={2}>{t("kiosk.title")}</Title>
        <Group gap={6}>
          <ThemeIcon variant="light" color="gray" radius="xl"><IconClock size={16} /></ThemeIcon>
          <div>
            <Text fw={700} fz="lg" lh={1}>{clock}</Text>
            <Text size="xs" c="dimmed">{today}</Text>
          </div>
        </Group>
      </Group>

      <Card withBorder radius="lg" w="100%" maw={560} padding="lg">
        <Text ta="center" c="dimmed" size="sm" mb="sm">{t("kiosk.hint")}</Text>

        {/* Camera viewport */}
        <Box
          id={READER_ID}
          style={{
            width: "100%", maxWidth: 320, margin: "0 auto", borderRadius: 12,
            overflow: "hidden", background: "var(--mantine-color-dark-8)", minHeight: 240,
          }}
        />

        {cameraError && (
          <Alert mt="sm" color="yellow" variant="light" icon={<IconCameraOff size={16} />}>
            {t("kiosk.cameraError")}
          </Alert>
        )}

        {/* Result banner */}
        <Box mt="md" mih={92}>
          {feedback?.kind === "ok" && <ResultCard result={feedback.result} />}
          {feedback?.kind === "error" && (
            <Card withBorder radius="md" bg="var(--mantine-color-red-light)">
              <Group>
                <ThemeIcon size={42} radius="md" color="red" variant="light"><IconAlertTriangle size={24} /></ThemeIcon>
                <div>
                  <Text fw={700} c="red.7">{t("kiosk.failed")}</Text>
                  <Text size="sm">{feedback.message}</Text>
                </div>
              </Group>
            </Card>
          )}
          {!feedback && (
            <Group justify="center" c="dimmed" gap={8} py="sm">
              <IconScan size={20} />
              <Text size="sm">{t("kiosk.waiting")}</Text>
            </Group>
          )}
        </Box>

        <Divider my="sm" label={t("kiosk.manualLabel")} labelPosition="center" />
        <Group>
          <TextInput
            flex={1}
            placeholder={t("kiosk.manualPlaceholder")}
            value={manual}
            onChange={(e) => setManual(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleToken(manual); }}
          />
          <Button loading={busy} leftSection={<IconScan size={16} />} onClick={() => void handleToken(manual)}>
            {t("kiosk.submit")}
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const { t } = useTranslation();
  const isIn = result.eventType === "in";
  const time = new Date(result.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <Card withBorder radius="md" bg={isIn ? "var(--mantine-color-teal-light)" : "var(--mantine-color-blue-light)"}>
      <Group justify="space-between">
        <Group>
          <ThemeIcon size={48} radius="md" color={isIn ? "teal" : "blue"} variant="light">
            {isIn ? <IconLogin2 size={26} /> : <IconLogout2 size={26} />}
          </ThemeIcon>
          <div>
            <Text fw={800} fz="lg" lh={1.1}>{result.employeeName}</Text>
            <Text fw={600} c={isIn ? "teal.7" : "blue.7"}>
              {isIn ? t("kiosk.checkedIn") : t("kiosk.checkedOut")} · {time}
            </Text>
          </div>
        </Group>
        <Group gap={6}>
          {!!result.lateMinutes && result.lateMinutes > 0 && (
            <Badge color="yellow" variant="light">{t("kiosk.late", { n: result.lateMinutes })}</Badge>
          )}
          {!isIn && !!result.workedMinutes && (
            <Badge color="gray" variant="light">{(result.workedMinutes / 60).toFixed(1)} {t("attendance.h")}</Badge>
          )}
          {!isIn && !!result.overtimeMinutes && result.overtimeMinutes > 0 && (
            <Badge color="teal" variant="light">+{result.overtimeMinutes} {t("attendance.min")}</Badge>
          )}
        </Group>
      </Group>
    </Card>
  );
}
