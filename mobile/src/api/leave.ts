import { api } from "./client";
import type { LeaveType, LeaveRequest, LeaveBalance } from "../types";

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const res = await api.get<LeaveType[]>("/leave-types");
  return res.data;
}
export async function createLeaveType(body: { name: string; isPaid: boolean; defaultDays: number }): Promise<LeaveType> {
  const res = await api.post<LeaveType>("/leave-types", body);
  return res.data;
}
export async function updateLeaveType(id: number, body: { name: string; isPaid: boolean; defaultDays: number }): Promise<LeaveType> {
  const res = await api.put<LeaveType>(`/leave-types/${id}`, body);
  return res.data;
}
export async function deleteLeaveType(id: number): Promise<void> {
  await api.delete(`/leave-types/${id}`);
}

export async function listLeaveRequests(params: { status?: string; employeeId?: number } = {}): Promise<LeaveRequest[]> {
  const res = await api.get<LeaveRequest[]>("/leave-requests", { params });
  return res.data;
}
export async function createLeaveRequest(body: {
  employeeId: number; leaveTypeId: number; dateFrom: string; dateTo: string; reason?: string;
}): Promise<LeaveRequest> {
  const res = await api.post<LeaveRequest>("/leave-requests", body);
  return res.data;
}
export async function decideLeave(id: number, decision: "approved" | "rejected", comment?: string): Promise<LeaveRequest> {
  const res = await api.post<LeaveRequest>(`/leave-requests/${id}/decision`, { decision, comment });
  return res.data;
}
export async function leaveBalances(employeeId: number): Promise<LeaveBalance[]> {
  const res = await api.get<LeaveBalance[]>(`/employees/${employeeId}/leave-balances`);
  return res.data;
}
