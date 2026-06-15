import { api } from "./client";
import type { Shift, EmployeeShift, PayRate, RaiseMethod, RaisePreview } from "../types";

export async function listShifts(): Promise<Shift[]> {
  const res = await api.get<Shift[]>("/shifts");
  return res.data;
}

export async function createShift(body: {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  graceInMinutes?: number;
  graceOutMinutes?: number;
  overtimeAfterMin?: number | null;
  isOvernight?: boolean;
  weekdays: number[];
}): Promise<Shift> {
  const res = await api.post<Shift>("/shifts", body);
  return res.data;
}

export async function listEmployeeShifts(employeeId: number): Promise<EmployeeShift[]> {
  const res = await api.get<EmployeeShift[]>(`/employees/${employeeId}/shifts`);
  return res.data;
}

export async function assignShift(
  employeeId: number,
  body: { shiftId: number; validFrom: string; validTo?: string | null }
): Promise<EmployeeShift> {
  const res = await api.post<EmployeeShift>(`/employees/${employeeId}/shifts`, body);
  return res.data;
}

export async function listPayRates(employeeId: number): Promise<PayRate[]> {
  const res = await api.get<PayRate[]>(`/employees/${employeeId}/pay-rates`);
  return res.data;
}

export async function setPayRate(
  employeeId: number,
  body: {
    model: string;
    hourlyRate?: number | null;
    monthlySalary?: number | null;
    shiftRate?: number | null;
    currency?: string;
    validFrom: string;
  }
): Promise<PayRate> {
  const res = await api.post<PayRate>(`/employees/${employeeId}/pay-rates`, body);
  return res.data;
}

export async function updateCurrentRate(
  employeeId: number,
  body: {
    model: string;
    hourlyRate?: number | null;
    monthlySalary?: number | null;
    shiftRate?: number | null;
    currency?: string;
  }
): Promise<PayRate> {
  const res = await api.put<PayRate>(`/employees/${employeeId}/pay-rates/current`, body);
  return res.data;
}

export async function deleteCurrentRate(employeeId: number): Promise<void> {
  await api.delete(`/employees/${employeeId}/pay-rates/current`);
}

export async function previewRaise(
  employeeId: number,
  body: { method: RaiseMethod; value: number; effectiveFrom: string }
): Promise<RaisePreview> {
  const res = await api.post<RaisePreview>(`/employees/${employeeId}/pay-rates/raise/preview`, body);
  return res.data;
}

export async function applyRaise(
  employeeId: number,
  body: { method: RaiseMethod; value: number; effectiveFrom: string }
): Promise<PayRate> {
  const res = await api.post<PayRate>(`/employees/${employeeId}/pay-rates/raise`, body);
  return res.data;
}
