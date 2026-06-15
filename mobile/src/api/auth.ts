import { api } from "./client";

export interface UserBrief {
  id: number;
  login: string;
  role: string;
  employeeId: number | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserBrief;
}

export async function login(loginName: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", { login: loginName, password });
  return res.data;
}

export async function me(): Promise<UserBrief> {
  const res = await api.get<UserBrief>("/auth/me");
  return res.data;
}
