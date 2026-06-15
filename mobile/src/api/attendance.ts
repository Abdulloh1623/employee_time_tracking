import { api, deviceId } from "./client";
import { localScanTime } from "../time";

export interface ScanResult {
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  eventType: "in" | "out";
  recordedAt: string;
  status: string;
  lateMinutes: number | null;
  workedMinutes: number | null;
  overtimeMinutes: number | null;
}

export interface AttendanceRow {
  id: number;
  employeeId: number;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  status: string;
}

export interface RosterEntry {
  id: number;
  name: string;
}

export interface ScanPayload {
  qrToken?: string;
  employeeId?: number;
  scannedAt: string;
  deviceId: string;
}

/** Build a scan payload, stamping the device-local time (timezone-correct) + device id. */
export async function makeScanPayload(arg: { qrToken?: string; employeeId?: number }): Promise<ScanPayload> {
  return { ...arg, scannedAt: localScanTime(), deviceId: await deviceId() };
}

export async function submitScan(p: ScanPayload): Promise<ScanResult> {
  const res = await api.post<ScanResult>("/attendance/scan", p);
  return res.data;
}

export async function roster(): Promise<RosterEntry[]> {
  const res = await api.get<RosterEntry[]>("/attendance/roster");
  return res.data;
}

export async function listAttendance(dateFrom: string, dateTo: string, employeeId?: number): Promise<AttendanceRow[]> {
  const res = await api.get<AttendanceRow[]>("/attendance", { params: { dateFrom, dateTo, employeeId } });
  return res.data;
}
