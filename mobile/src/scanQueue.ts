import AsyncStorage from "@react-native-async-storage/async-storage";
import { submitScan, type ScanPayload } from "./api/attendance";

// Offline queue: scans captured while the network is down are stored (with their
// device-local scannedAt time) and replayed later — so attendance time stays correct.

const KEY = "tg_scan_queue";

export async function getQueue(): Promise<ScanPayload[]> {
  const raw = await AsyncStorage.getItem(KEY);
  try {
    return raw ? (JSON.parse(raw) as ScanPayload[]) : [];
  } catch {
    return [];
  }
}

export async function queueSize(): Promise<number> {
  return (await getQueue()).length;
}

export async function enqueue(p: ScanPayload): Promise<number> {
  const q = await getQueue();
  q.push(p);
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
  return q.length;
}

/** Try to send every queued scan; keep the ones that still fail. */
export async function drain(): Promise<{ sent: number; left: number }> {
  const q = await getQueue();
  let sent = 0;
  const remaining: ScanPayload[] = [];
  for (const p of q) {
    try {
      await submitScan(p);
      sent++;
    } catch {
      remaining.push(p);
    }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
  return { sent, left: remaining.length };
}
