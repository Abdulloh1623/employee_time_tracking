import { api } from "./client";
import type { TokenResponse, UserBrief } from "../types";

export async function login(loginName: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", { login: loginName, password });
  return res.data;
}

export async function me(): Promise<UserBrief> {
  const res = await api.get<UserBrief>("/auth/me");
  return res.data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password", { oldPassword, newPassword });
}
