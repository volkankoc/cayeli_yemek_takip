import apiClient from "./client";
import type { ApiResponse, Department } from "@/types";

export async function getDepartments(): Promise<Department[]> {
  const res = await apiClient.get<ApiResponse<Department[]>>("/departments");
  return res.data.data;
}

export async function createDepartment(name: string): Promise<Department> {
  const res = await apiClient.post<ApiResponse<Department>>("/departments", { name });
  return res.data.data;
}

export async function updateDepartment(id: number, name: string): Promise<Department> {
  const res = await apiClient.put<ApiResponse<Department>>(`/departments/${id}`, { name });
  return res.data.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`);
}
