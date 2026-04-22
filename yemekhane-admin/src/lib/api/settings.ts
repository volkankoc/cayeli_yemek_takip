import apiClient from "./client";
import type { ApiResponse, Settings } from "@/types";

export async function getSettings(): Promise<Settings> {
  const res = await apiClient.get<ApiResponse<Settings>>("/settings");
  return res.data.data;
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const res = await apiClient.put<ApiResponse<Settings>>("/settings", data);
  return res.data.data;
}
