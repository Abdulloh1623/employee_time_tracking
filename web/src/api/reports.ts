import { api } from "./client";

export interface AttendanceReportRow {
  employeeId: number;
  employeeName: string;
  department: string;
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
}

export async function attendanceReport(params: {
  dateFrom: string;
  dateTo: string;
  departmentId?: number;
}): Promise<AttendanceReportRow[]> {
  const res = await api.get<AttendanceReportRow[]>("/reports/attendance", {
    params: { ...params, format: "json" },
  });
  return res.data;
}

function triggerDownload(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadAttendanceReport(
  params: { dateFrom: string; dateTo: string; departmentId?: number },
  format: "xlsx" | "pdf"
): Promise<void> {
  const res = await api.get("/reports/attendance", {
    params: { ...params, format },
    responseType: "blob",
  });
  triggerDownload(res.data, `attendance_${params.dateFrom}_${params.dateTo}.${format}`);
}

export async function downloadPayrollReport(periodId: number, format: "xlsx" | "pdf"): Promise<void> {
  const res = await api.get("/reports/payroll", {
    params: { periodId, format },
    responseType: "blob",
  });
  triggerDownload(res.data, `payroll_period_${periodId}.${format}`);
}
