import { api } from "./client";
import type { Employee, EmployeeCreate, PageResponse, Department, Position } from "../types";

export async function listEmployees(params: {
  page?: number;
  perPage?: number;
  departmentId?: number;
  status?: string;
  q?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<PageResponse<Employee>> {
  const res = await api.get<PageResponse<Employee>>("/employees", { params });
  return res.data;
}

export async function createEmployee(body: EmployeeCreate): Promise<Employee> {
  const res = await api.post<Employee>("/employees", body);
  return res.data;
}

export async function updateEmployee(id: number, body: EmployeeCreate): Promise<Employee> {
  const res = await api.put<Employee>(`/employees/${id}`, body);
  return res.data;
}

export async function deactivateEmployee(id: number): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function activateEmployee(id: number): Promise<Employee> {
  const res = await api.post<Employee>(`/employees/${id}/activate`);
  return res.data;
}

export async function regenerateQr(id: number): Promise<Employee> {
  const res = await api.post<Employee>(`/employees/${id}/qr/regenerate`);
  return res.data;
}

export async function listDepartments(): Promise<Department[]> {
  const res = await api.get<Department[]>("/departments");
  return res.data;
}

export async function listPositions(): Promise<Position[]> {
  const res = await api.get<Position[]>("/positions");
  return res.data;
}
