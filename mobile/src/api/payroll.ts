import { api } from "./client";
import type { PayrollPeriod, PayrollRow, Payslip, RunSummary, Adjustment, PayrollRule } from "../types";

export async function listPeriods(): Promise<PayrollPeriod[]> {
  const res = await api.get<PayrollPeriod[]>("/payroll/periods");
  return res.data;
}
export async function createPeriod(body: { name: string; startDate: string; endDate: string }): Promise<PayrollPeriod> {
  const res = await api.post<PayrollPeriod>("/payroll/periods", body);
  return res.data;
}
export async function updatePeriod(id: number, body: { name: string; startDate: string; endDate: string }): Promise<PayrollPeriod> {
  const res = await api.put<PayrollPeriod>(`/payroll/periods/${id}`, body);
  return res.data;
}
export async function deletePeriod(id: number): Promise<void> {
  await api.delete(`/payroll/periods/${id}`);
}
export async function calculatePeriod(id: number): Promise<RunSummary> {
  const res = await api.post<RunSummary>(`/payroll/periods/${id}/calculate`);
  return res.data;
}
export async function closePeriod(id: number): Promise<PayrollPeriod> {
  const res = await api.post<PayrollPeriod>(`/payroll/periods/${id}/close`);
  return res.data;
}
export async function reopenPeriod(id: number): Promise<PayrollPeriod> {
  const res = await api.post<PayrollPeriod>(`/payroll/periods/${id}/reopen`);
  return res.data;
}
export async function markPeriodPaid(id: number): Promise<PayrollPeriod> {
  const res = await api.post<PayrollPeriod>(`/payroll/periods/${id}/mark-paid`);
  return res.data;
}
export async function listPayrolls(periodId: number): Promise<PayrollRow[]> {
  const res = await api.get<PayrollRow[]>("/payrolls", { params: { periodId } });
  return res.data;
}
export async function getPayslip(id: number): Promise<Payslip> {
  const res = await api.get<Payslip>(`/payrolls/${id}`);
  return res.data;
}
export async function addAdjustment(payrollId: number, body: { type: string; amount: number; reason: string }): Promise<Adjustment> {
  const res = await api.post<Adjustment>(`/payrolls/${payrollId}/adjustments`, body);
  return res.data;
}
export async function updateAdjustment(payrollId: number, adjustmentId: number, body: { type: string; amount: number; reason: string }): Promise<Adjustment> {
  const res = await api.put<Adjustment>(`/payrolls/${payrollId}/adjustments/${adjustmentId}`, body);
  return res.data;
}
export async function deleteAdjustment(payrollId: number, adjustmentId: number): Promise<void> {
  await api.delete(`/payrolls/${payrollId}/adjustments/${adjustmentId}`);
}

// ---- Rules ----
export async function listRules(): Promise<PayrollRule[]> {
  const res = await api.get<PayrollRule[]>("/payroll/rules");
  return res.data;
}
export async function createRule(body: Omit<PayrollRule, "id">): Promise<PayrollRule> {
  const res = await api.post<PayrollRule>("/payroll/rules", body);
  return res.data;
}
export async function updateRule(id: number, body: Omit<PayrollRule, "id">): Promise<PayrollRule> {
  const res = await api.put<PayrollRule>(`/payroll/rules/${id}`, body);
  return res.data;
}
export async function deleteRule(id: number): Promise<void> {
  await api.delete(`/payroll/rules/${id}`);
}
