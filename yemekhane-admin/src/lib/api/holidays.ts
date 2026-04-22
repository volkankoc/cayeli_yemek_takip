import apiClient from "./client";
import type { ApiResponse, Holiday } from "@/types";

export async function getHolidays(year?: number): Promise<Holiday[]> {
  const params = year ? `?year=${year}` : "";
  const res = await apiClient.get<ApiResponse<Holiday[]>>(`/holidays${params}`);
  return res.data.data;
}

export async function createHoliday(data: { date: string; description: string }): Promise<Holiday> {
  const res = await apiClient.post<ApiResponse<Holiday>>("/holidays", data);
  return res.data.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await apiClient.delete(`/holidays/${id}`);
}
