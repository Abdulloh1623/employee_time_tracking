import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, Modal, FlatList,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import {
  submitScan, makeScanPayload, roster, type ScanResult, type RosterEntry,
} from "../api/attendance";
import { enqueue, drain, queueSize } from "../scanQueue";
import { apiErrorMessage } from "../api/client";
import { useTheme, type Colors } from "../theme";
import { useToast } from "../components/Toast";

type Feedback =
  | { kind: "ok"; result: ScanResult }
  | { kind: "queued" }
  | { kind: "error"; message: string };

interface LogEntry { key: string; name: string; eventType: "in" | "out"; time: string }

const RESET_MS = 3500;

export default function ScanScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [queued, setQueued] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rosterList, setRosterList] = useState<RosterEntry[]>([]);

  const lockRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => { queueSize().then(setQueued); }, []);

  async function syncQueue() {
    if ((await queueSize()) === 0) return;
    const { sent, left } = await drain();
    setQueued(left);
    if (sent > 0) toast.show(t("scan.synced", { n: sent }), "success");
  }

  async function process(arg: { qrToken?: string; employeeId?: number }) {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    const payload = await makeScanPayload(arg);
    try {
      const result = await submitScan(payload);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedback({ kind: "ok", result });
      const time = new Date(result.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLog((l) => [{ key: `${seq.current++}`, name: result.employeeName, eventType: result.eventType, time }, ...l].slice(0, 12));
      void syncQueue(); // network is back — flush any queued scans
    } catch (err) {
      const hasResponse = !!(err as { response?: unknown }).response;
      if (!hasResponse) {
        const n = await enqueue(payload);
        setQueued(n);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setFeedback({ kind: "queued" });
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedback({ kind: "error", message: apiErrorMessage(err) });
      }
    } finally {
      setBusy(false);
      setManual("");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { setFeedback(null); lockRef.current = false; }, RESET_MS);
    }
  }

  function openPicker() {
    roster().then(setRosterList).catch((err) => toast.show(apiErrorMessage(err), "error"));
    setPickerOpen(true);
  }

  if (!permission) return <Center styles={styles}><ActivityIndicator color={colors.brand} /></Center>;
  if (!permission.granted) {
    return (
      <Center styles={styles}>
        <Text style={styles.permTitle}>{t("scan.permTitle")}</Text>
        <Text style={styles.permHint}>{t("scan.permHint")}</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t("scan.grant")}</Text>
        </Pressable>
      </Center>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hint}>{t("scan.hint")}</Text>

      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={lockRef.current ? undefined : ({ data }) => process({ qrToken: data })}
        />
        <View style={styles.reticle} />
      </View>

      <View style={styles.resultArea}>
        {busy && <ActivityIndicator size="large" color={colors.brand} />}
        {!busy && feedback?.kind === "ok" && <ResultCard result={feedback.result} styles={styles} colors={colors} />}
        {!busy && feedback?.kind === "queued" && (
          <View style={[styles.card, styles.cardQueued]}>
            <Ionicons name="cloud-offline-outline" size={22} color={colors.orange} />
            <Text style={styles.cardQueuedText}>{t("scan.queued")}</Text>
          </View>
        )}
        {!busy && feedback?.kind === "error" && (
          <View style={[styles.card, styles.cardError]}>
            <Text style={styles.cardTitleError}>{t("scan.failed")}</Text>
            <Text style={styles.cardErrorMessage}>{feedback.message}</Text>
          </View>
        )}
        {!busy && !feedback && <Text style={styles.waiting}>{t("scan.waiting")}</Text>}
      </View>

      {queued > 0 && (
        <Pressable style={styles.queueBanner} onPress={syncQueue}>
          <Ionicons name="sync" size={16} color="#fff" />
          <Text style={styles.queueText}>{t("scan.queuedCount", { n: queued })}</Text>
          <Text style={styles.queueSync}>{t("scan.sync")}</Text>
        </Pressable>
      )}

      <Text style={styles.manualLabel}>{t("scan.manualLabel")}</Text>
      <View style={styles.manualRow}>
        <TextInput
          style={styles.manualInput}
          placeholder={t("scan.manualPlaceholder")}
          placeholderTextColor={colors.dim}
          autoCapitalize="characters"
          value={manual}
          onChangeText={setManual}
        />
        <Pressable style={styles.button} onPress={() => process({ qrToken: manual })}>
          <Text style={styles.buttonText}>{t("scan.submit")}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.pickBtn} onPress={openPicker}>
        <Ionicons name="people-outline" size={16} color={colors.brand} />
        <Text style={styles.pickText}>{t("scan.pick")}</Text>
      </Pressable>

      {/* today's scan log */}
      <View style={styles.logSection}>
        <Text style={styles.logTitle}>{t("scan.todayLog")}</Text>
        {log.length === 0 ? (
          <Text style={styles.logEmpty}>{t("scan.logEmpty")}</Text>
        ) : (
          log.map((e) => (
            <View key={e.key} style={styles.logRow}>
              <Text style={styles.logName}>{e.name}</Text>
              <Text style={[styles.logEvent, { color: e.eventType === "in" ? colors.green : colors.brand }]}>
                {e.eventType === "in" ? t("scan.checkedIn") : t("scan.checkedOut")} · {e.time}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* employee picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("scan.pickTitle")}</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </View>
            <FlatList
              data={rosterList}
              keyExtractor={(r) => String(r.id)}
              style={styles.modalList}
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => { setPickerOpen(false); process({ employeeId: item.id }); }}>
                  <Text style={styles.pickRowName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.dim} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ResultCard({ result, styles, colors }: { result: ScanResult; styles: ReturnType<typeof makeStyles>; colors: Colors }) {
  const { t } = useTranslation();
  const isIn = result.eventType === "in";
  const time = new Date(result.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[styles.card, isIn ? styles.cardIn : styles.cardOut]}>
      <Text style={styles.cardName}>{result.employeeName}</Text>
      <Text style={[styles.cardEvent, { color: isIn ? colors.green : colors.brand }]}>
        {isIn ? `✅ ${t("scan.checkedIn")}` : `👋 ${t("scan.checkedOut")}`} · {time}
      </Text>
      <View style={styles.badgeRow}>
        {!!result.lateMinutes && result.lateMinutes > 0 && (
          <Text style={styles.badgeWarn}>{t("scan.late", { n: result.lateMinutes })}</Text>
        )}
        {!isIn && !!result.workedMinutes && (
          <Text style={styles.badge}>{(result.workedMinutes / 60).toFixed(1)} {t("scan.hours")}</Text>
        )}
      </View>
    </View>
  );
}

function Center({ children, styles }: { children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.center}>{children}</View>;
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { padding: 16, alignItems: "center" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    hint: { color: c.dim, marginBottom: 10 },
    cameraBox: { width: "100%", aspectRatio: 1, maxWidth: 320, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
    reticle: { position: "absolute", top: "20%", left: "20%", width: "60%", height: "60%", borderWidth: 3, borderColor: "#ffffffcc", borderRadius: 12 },
    resultArea: { minHeight: 92, width: "100%", alignItems: "center", justifyContent: "center", marginVertical: 12 },
    waiting: { color: c.dim },
    card: { width: "100%", maxWidth: 340, borderRadius: 12, padding: 14, borderWidth: 1 },
    cardIn: { backgroundColor: c.greenLight, borderColor: c.green },
    cardOut: { backgroundColor: c.brandLight, borderColor: c.brand },
    cardError: { backgroundColor: c.redLight, borderColor: c.red },
    cardQueued: { backgroundColor: c.yellowLight, borderColor: c.orange, flexDirection: "row", alignItems: "center", gap: 8 },
    cardQueuedText: { color: c.orange, fontWeight: "700", flex: 1 },
    cardName: { fontSize: 18, fontWeight: "800", color: c.text },
    cardEvent: { fontSize: 15, fontWeight: "600", marginTop: 2 },
    cardTitleError: { fontWeight: "700", color: c.red, marginBottom: 4 },
    cardErrorMessage: { color: c.text },
    badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    badge: { backgroundColor: c.border, color: c.dim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden", fontSize: 12 },
    badgeWarn: { backgroundColor: c.yellowLight, color: c.orange, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden", fontSize: 12 },
    queueBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, width: "100%", maxWidth: 340, marginBottom: 4 },
    queueText: { color: "#fff", flex: 1, fontWeight: "600" },
    queueSync: { color: "#fff", fontWeight: "800", textDecorationLine: "underline" },
    manualLabel: { color: c.dim, marginTop: 8, marginBottom: 6 },
    manualRow: { flexDirection: "row", width: "100%", maxWidth: 340, gap: 8 },
    manualInput: { flex: 1, backgroundColor: c.card, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    button: { backgroundColor: c.brand, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
    buttonText: { color: "#fff", fontWeight: "700" },
    pickBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.brand },
    pickText: { color: c.brand, fontWeight: "700" },
    logSection: { width: "100%", maxWidth: 340, marginTop: 18 },
    logTitle: { color: c.dim, fontWeight: "700", marginBottom: 8 },
    logEmpty: { color: c.dim, fontStyle: "italic" },
    logRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.card, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: c.border },
    logName: { color: c.text, fontWeight: "600", flex: 1 },
    logEvent: { fontSize: 12, fontWeight: "700", marginLeft: 8 },
    permTitle: { fontSize: 18, fontWeight: "700", color: c.text, marginBottom: 6 },
    permHint: { color: c.dim, textAlign: "center", marginBottom: 16 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: c.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "75%", paddingBottom: 12 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    modalTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    modalList: { paddingHorizontal: 12, paddingTop: 8 },
    pickRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    pickRowName: { color: c.text, fontWeight: "600", fontSize: 15 },
  });
}
