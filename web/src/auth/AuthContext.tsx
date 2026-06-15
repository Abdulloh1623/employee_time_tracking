import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, me as apiMe } from "../api/auth";
import { setTokens, clearTokens, getToken } from "../api/client";
import type { UserBrief } from "../types";

interface AuthState {
  user: UserBrief | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe()
      .then(setUser)
      .catch(() => { clearTokens(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // The axios interceptor dispatches this when the session truly expires (refresh failed).
  useEffect(() => {
    function onExpired() { setUser(null); }
    window.addEventListener("tg:auth-expired", onExpired);
    return () => window.removeEventListener("tg:auth-expired", onExpired);
  }, []);

  async function signIn(loginName: string, password: string) {
    const res = await apiLogin(loginName, password);
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
  }

  function signOut() {
    clearTokens();
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
