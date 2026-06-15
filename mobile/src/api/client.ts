import axios, { type AxiosRequestConfig } from "axios";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

const ACCESS = "tg_access_token";
const REFRESH = "tg_refresh_token";
const DEVICE = "tg_device_id";

export const AUTH_EXPIRED = "tg:auth-expired";

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
// Plain instance (no interceptors) used for the refresh call itself.
const plain = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (cfg) => {
  const token = await AsyncStorage.getItem(ACCESS);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([[ACCESS, access], [REFRESH, refresh]]);
}
export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS, REFRESH]);
}
export async function getAccess(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS);
}
export async function getRefresh(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH);
}

export async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE);
  if (!id) {
    id = "mobile-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(DEVICE, id);
  }
  return id;
}

// ---- single-flight token refresh ----
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refresh = await getRefresh();
  if (!refresh) throw new Error("no refresh token");
  const res = await plain.post("/auth/refresh", { refreshToken: refresh });
  const { accessToken, refreshToken } = res.data;
  await setTokens(accessToken, refreshToken);
  return accessToken;
}

async function forceLogout(): Promise<void> {
  await clearTokens();
  DeviceEventEmitter.emit(AUTH_EXPIRED);
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as AxiosRequestConfig & { _retried?: boolean };
    const status = err?.response?.status;
    const url: string = original?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (status !== 401 || isAuthCall) return Promise.reject(err);
    if (original._retried) return Promise.reject(err); // retried with fresh token, still 401 -> not a session problem
    if (!(await getRefresh())) { await forceLogout(); return Promise.reject(err); }

    original._retried = true;
    try {
      const newAccess = await (refreshPromise ??= doRefresh());
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      await forceLogout();
      return Promise.reject(err);
    } finally {
      refreshPromise = null;
    }
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
  }
  return "Xatolik yuz berdi";
}
