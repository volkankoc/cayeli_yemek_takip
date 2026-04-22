import apiClient from "./client";
import type { ApiResponse, MealType } from "@/types";

export async function getMealTypes(): Promise<MealType[]> {
  const res = await apiClient.get<ApiResponse<MealType[]>>("/meal-types");
  return res.data.data;
}

export async function createMealType(data: { name: string; daily_limit: number }): Promise<MealType> {
  const res = await apiClient.post<ApiResponse<MealType>>("/meal-types", data);
  return res.data.data;
}

export async function updateMealType(
  id: number,
  data: { name?: string; daily_limit?: number; is_active?: number }
): Promise<MealType> {
  const res = await apiClient.put<ApiResponse<MealType>>(`/meal-types/${id}`, data);
  return res.data.data;
}
