// Self-service API: every call returns ONLY the signed-in employee's own data.
import { api } from "./client";
import type { AttendanceRow } from "./attendance";
import type { Employee, Payslip, LeaveBalance, LeaveRequest, LeaveType } from "../types";

export async function myProfile(): Promise<Employee> {
  const res = await api.get<Employee>("/me/profile");
  return res.data;
}

export async function myAttendance(dateFrom: string, dateTo: string): Promise<AttendanceRow[]> {
  const res = await api.get<AttendanceRow[]>("/me/attendance", { params: { dateFrom, dateTo } });
  return res.data;
}

export async function myPayslips(): Promise<Payslip[]> {
  const res = await api.get<Payslip[]>("/me/payslips");
  return res.data;
}

export async function myLeaveBalances(): Promise<LeaveBalance[]> {
  const res = await api.get<LeaveBalance[]>("/me/leave-balances");
  return res.data;
}

export async function myLeaveRequests(): Promise<LeaveRequest[]> {
  const res = await api.get<LeaveRequest[]>("/me/leave-requests");
  return res.data;
}

export async function myLeaveTypes(): Promise<LeaveType[]> {
  const res = await api.get<LeaveType[]>("/me/leave-types");
  return res.data;
}

export interface SelfLeaveBody {
  leaveTypeId: number;
  dateFrom: string;
  dateTo: string;
  reason?: string;
}

export async function submitMyLeave(body: SelfLeaveBody): Promise<LeaveRequest> {
  const res = await api.post<LeaveRequest>("/me/leave-requests", body);
  return res.data;
}
