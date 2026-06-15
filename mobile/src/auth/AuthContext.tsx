import React, { createContext, useContext, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { login as apiLogin, me as apiMe, type UserBrief } from "../api/auth";
import { setTokens, clearTokens, getAccess, AUTH_EXPIRED } from "../api/client";

interface AuthState {
  user: UserBrief | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getAccess();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setUser(await apiMe());
      } catch {
        await clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The axios interceptor emits this when the session truly expires (refresh failed).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AUTH_EXPIRED, () => setUser(null));
    return () => sub.remove();
  }, []);

  async function signIn(loginName: string, password: string) {
    const res = await apiLogin(loginName, password);
    await setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
  }

  async function signOut() {
    await clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
