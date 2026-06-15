import { api } from "./client";
import type { PageResponse } from "../types";

export interface AuditLog {
  id: number;
  userId: number | null;
  userLogin: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function listAuditLogs(params: {
  action?: string;
  page?: number;
  perPage?: number;
}): Promise<PageResponse<AuditLog>> {
  const res = await api.get<PageResponse<AuditLog>>("/audit-logs", { params });
  return res.data;
}
