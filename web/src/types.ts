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

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  departmentId: number;
  positionId: number;
  employmentType: string;
  payrollModel: string;
  qrToken?: string | null;
  phone?: string | null;
  email?: string | null;
  hireDate: string;
  status: string;
}

export interface EmployeeCreate {
  firstName: string;
  lastName: string;
  middleName?: string;
  departmentId: number;
  positionId: number;
  employmentType: string;
  payrollModel: string;
  phone?: string;
  email?: string;
  hireDate: string;
}

export interface PageResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
}

export interface Department {
  id: number;
  name: string;
  managerId?: number | null;
}

export interface Position {
  id: number;
  title: string;
}

export interface PayrollPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "calculated" | "closed" | "paid";
}

export interface PayrollRow {
  id: number;
  periodId: number;
  employeeId: number;
  employeeName: string;
  model: string;
  workedHours: number;
  workedShifts: number;
  workedDays: number;
  lateMinutes: number;
  overtimeMinutes: number;
  gross: number;
  totalBonus: number;
  totalFine: number;
  totalDeduction: number;
  net: number;
  currency: string;
  status: string;
}

export interface PayrollRule {
  id: number;
  name: string;
  type: string;        // bonus | fine
  trigger: string;     // zero_lateness | per_late_minute | early_leave | absence | holiday | night | kpi
  amountType: string;  // fixed | percent | per_minute
  amountValue: number;
  isActive: boolean;
}

export interface Adjustment {
  id: number;
  type: string;
  amount: number;
  reason: string;
  ruleId: number | null;
}

export interface Payslip {
  payroll: PayrollRow;
  period: PayrollPeriod;
  adjustments: Adjustment[];
}

export interface RunSummary {
  periodId: number;
  employees: number;
  unconfigured: number;
  totalGross: number;
  totalNet: number;
  currency: string;
  status: string;
}

export interface LeaveType {
  id: number;
  name: string;
  isPaid: boolean;
  defaultDays: number;
}

export type DayType = "holiday" | "weekend" | "workday";

export interface Holiday {
  id: number;
  date: string;
  dayType: DayType;
  description?: string | null;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  reason?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approverId: number | null;
}

export interface LeaveBalance {
  leaveTypeId: number;
  leaveTypeName: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface AppNotification {
  id: number;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  sentAt: string;
}

export interface AttendanceRow {
  id: number;
  employeeId: number;
  shiftId?: number | null;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes: number;
  status: string;
}

export interface ScanResult {
  attendanceId: number;
  employeeId: number;
  employeeName: string;
  eventType: "in" | "out";
  recordedAt: string;
  status: string;
  lateMinutes: number | null;
  workedMinutes: number | null;
  overtimeMinutes: number | null;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceInMinutes: number;
  graceOutMinutes: number;
  overtimeAfterMin: number | null;
  isOvernight: boolean;
  weekdays: number[];
}

export interface EmployeeShift {
  id: number;
  shiftId: number;
  shiftName: string;
  validFrom: string;
  validTo: string | null;
}

export interface PayRate {
  id: number;
  model: string;
  hourlyRate: number | null;
  monthlySalary: number | null;
  shiftRate: number | null;
  currency: string;
  validFrom: string;
  validTo: string | null;
}

export type RaiseMethod = "percent" | "amount" | "set";
export type RaiseEffectiveOption = "today" | "month_start" | "next_month" | "custom";

export interface RaisePreview {
  model: string;
  field: string; // hourlyRate | monthlySalary | shiftRate
  currentValue: number;
  newValue: number;
  currency: string;
  effectiveFrom: string;
}
