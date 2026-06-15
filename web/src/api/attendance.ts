import { api } from "./client";
import type { AttendanceRow, ScanResult } from "../types";

/** A stable per-device id for this kiosk, persisted in localStorage. */
export function kioskDeviceId(): string {
  const KEY = "tg_kiosk_device";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? "kiosk-" + Date.now().toString(36));
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Current device-local time as ISO-8601 WITH the browser's UTC offset
 *  (e.g. "2026-06-08T14:30:00+05:00"), so the backend computes lateness in the
 *  device's timezone regardless of the server's timezone. */
export function localScanTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

export async function scanQr(qrToken: string, deviceId: string): Promise<ScanResult> {
  const res = await api.post<ScanResult>("/attendance/scan", {
    qrToken,
    deviceId,
    scannedAt: localScanTime(),
  });
  return res.data;
}

export async function listAttendance(
  dateFrom: string,
  dateTo: string,
  employeeId?: number
): Promise<AttendanceRow[]> {
  const res = await api.get<AttendanceRow[]>("/attendance", { params: { dateFrom, dateTo, employeeId } });
  return res.data;
}
