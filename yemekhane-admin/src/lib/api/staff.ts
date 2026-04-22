import apiClient from "./client";
import type {
  ApiResponse,
  PaginatedData,
  Staff,
  StaffDetail,
  CreateStaffRequest,
  UpdateStaffRequest,
  MealRight,
} from "@/types";

interface StaffFilters {
  department_id?: number;
  is_active?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getStaffList(filters: StaffFilters = {}): Promise<PaginatedData<Staff>> {
  const params = new URLSearchParams();
  if (filters.department_id) params.set("department_id", String(filters.department_id));
  if (filters.is_active !== undefined && filters.is_active !== "") params.set("is_active", filters.is_active);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await apiClient.get<ApiResponse<PaginatedData<Staff>>>(`/staff?${params.toString()}`);
  return res.data.data;
}

export async function getStaffById(id: number): Promise<StaffDetail> {
  const res = await apiClient.get<ApiResponse<StaffDetail>>(`/staff/${id}`);
  return res.data.data;
}

export async function createStaff(data: CreateStaffRequest): Promise<StaffDetail> {
  const res = await apiClient.post<ApiResponse<StaffDetail>>("/staff", data);
  return res.data.data;
}

export async function updateStaff(id: number, data: UpdateStaffRequest): Promise<StaffDetail> {
  const res = await apiClient.put<ApiResponse<StaffDetail>>(`/staff/${id}`, data);
  return res.data.data;
}

export async function deleteStaff(id: number): Promise<void> {
  await apiClient.delete(`/staff/${id}`);
}

export async function getStaffMealRights(id: number): Promise<MealRight[]> {
  const res = await apiClient.get<ApiResponse<MealRight[]>>(`/staff/${id}/meal-rights`);
  return res.data.data;
}

export async function updateStaffMealRights(
  id: number,
  rights: { meal_type_id: number; monthly_quota: number }[]
): Promise<MealRight[]> {
  const res = await apiClient.put<ApiResponse<MealRight[]>>(`/staff/${id}/meal-rights`, { rights });
  return res.data.data;
}

export async function resetStaffMealRights(id: number): Promise<MealRight[]> {
  const res = await apiClient.post<ApiResponse<MealRight[]>>(`/staff/${id}/reset-meal-rights`);
  return res.data.data;
}

export async function bulkImportStaff(staff: CreateStaffRequest[]): Promise<{ created: number; skipped: number; errors: Array<{ barcode: string; message: string }> }> {
  const res = await apiClient.post<ApiResponse<{ created: number; skipped: number; errors: Array<{ barcode: string; message: string }> }>>('/staff/bulk-import', { staff });
  return res.data.data;
}

export async function uploadStaffPhoto(id: number, file: File): Promise<StaffDetail> {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await apiClient.post<ApiResponse<StaffDetail>>(`/staff/${id}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}
