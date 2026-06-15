import AsyncStorage from "@react-native-async-storage/async-storage";

// Timezone handling for attendance scans.
// By default the app uses the DEVICE's timezone (offset), so check-in/out times
// are recorded in the local time of wherever the phone is — regardless of the
// server's timezone. The user may override the offset manually in Profile.

const KEY = "tg_tz_offset"; // "auto" or a number of minutes east of UTC
let override: number | null = null; // null = auto (device)

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function loadTzOverride(): Promise<void> {
  const v = await AsyncStorage.getItem(KEY);
  override = v && v !== "auto" ? parseInt(v, 10) : null;
}

export function getTzOverride(): number | null {
  return override;
}

export async function setTzOverride(min: number | null): Promise<void> {
  override = min;
  await AsyncStorage.setItem(KEY, min == null ? "auto" : String(min));
}

export function deviceOffsetMin(): number {
  return -new Date().getTimezoneOffset();
}

export function effectiveOffsetMin(): number {
  return override == null ? deviceOffsetMin() : override;
}

/** Current device-local (or overridden) time as an ISO-8601 string WITH offset,
 *  e.g. "2026-06-08T14:30:00+05:00". Sent as `scannedAt` so the backend computes
 *  lateness against the correct wall-clock timezone. */
export function localScanTime(): string {
  const offMin = effectiveOffsetMin();
  const now = new Date();
  const wall = new Date(now.getTime() + offMin * 60000);
  const sign = offMin >= 0 ? "+" : "-";
  const a = Math.abs(offMin);
  return (
    `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
  );
}

export function offsetLabel(min: number): string {
  const sign = min >= 0 ? "+" : "-";
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `UTC${sign}${h}${m ? ":" + pad(m) : ""}`;
}

export function deviceTimeZoneName(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Common offsets (minutes) shown in the manual picker. */
export const OFFSET_CHOICES: number[] = [
  -300, -240, -180, 0, 60, 120, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540,
];
