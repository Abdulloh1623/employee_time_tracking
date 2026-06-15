import { api } from "./client";
import type { Department, Position, Holiday } from "../types";

// ---- Departments ----
export async function createDepartment(body: { name: string; managerId?: number | null }): Promise<Department> {
  const res = await api.post<Department>("/departments", body);
  return res.data;
}
export async function updateDepartment(id: number, body: { name: string; managerId?: number | null }): Promise<Department> {
  const res = await api.put<Department>(`/departments/${id}`, body);
  return res.data;
}
export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/departments/${id}`);
}

// ---- Positions ----
export async function createPosition(body: { title: string }): Promise<Position> {
  const res = await api.post<Position>("/positions", body);
  return res.data;
}
export async function updatePosition(id: number, body: { title: string }): Promise<Position> {
  const res = await api.put<Position>(`/positions/${id}`, body);
  return res.data;
}
export async function deletePosition(id: number): Promise<void> {
  await api.delete(`/positions/${id}`);
}

// ---- Holidays / work calendar ----
export async function listHolidays(year?: number): Promise<Holiday[]> {
  const res = await api.get<Holiday[]>("/holidays", { params: year ? { year } : {} });
  return res.data;
}
export async function createHoliday(body: { date: string; dayType: string; description?: string }): Promise<Holiday> {
  const res = await api.post<Holiday>("/holidays", body);
  return res.data;
}
export async function updateHoliday(id: number, body: { date: string; dayType: string; description?: string }): Promise<Holiday> {
  const res = await api.put<Holiday>(`/holidays/${id}`, body);
  return res.data;
}
export async function deleteHoliday(id: number): Promise<void> {
  await api.delete(`/holidays/${id}`);
}
