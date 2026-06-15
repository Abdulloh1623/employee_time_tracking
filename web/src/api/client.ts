import axios, { type AxiosRequestConfig } from "axios";

const ACCESS_KEY = "tg_access_token";
const REFRESH_KEY = "tg_refresh_token";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// A plain instance without interceptors, used for the refresh call itself
const plain = axios.create({ baseURL: "/api/v1", headers: { "Content-Type": "application/json" } });

export function setTokens(access: string | null, refresh?: string | null) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  else localStorage.removeItem(ACCESS_KEY);
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
export function getToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
export function getRefresh(): string | null { return localStorage.getItem(REFRESH_KEY); }

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh to avoid parallel refresh storms
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refresh = getRefresh();
  if (!refresh) throw new Error("no refresh token");
  const res = await plain.post("/auth/refresh", { refreshToken: refresh });
  const { accessToken, refreshToken } = res.data;
  setTokens(accessToken, refreshToken);
  return accessToken;
}

/** End the session WITHOUT a hard page reload: clear tokens and let React (AuthProvider) react. */
function forceLogout() {
  clearTokens();
  window.dispatchEvent(new Event("tg:auth-expired"));
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as AxiosRequestConfig & { _retried?: boolean };
    const status = err?.response?.status;
    const url: string = original?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (status !== 401 || isAuthCall) {
      return Promise.reject(err);
    }

    // Already retried with a fresh token and STILL 401 -> the session is fine,
    // this specific endpoint is the problem. Do NOT log the user out.
    if (original._retried) {
      return Promise.reject(err);
    }

    // No refresh token at all -> the user is not authenticated.
    if (!getRefresh()) {
      forceLogout();
      return Promise.reject(err);
    }

    // Try a single refresh + retry. Only log out if the REFRESH itself fails.
    original._retried = true;
    try {
      const newAccess = await (refreshPromise ??= doRefresh());
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      forceLogout();
      return Promise.reject(err);
    } finally {
      refreshPromise = null;
    }
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? err.message;
  }
  return "Unexpected error";
}
