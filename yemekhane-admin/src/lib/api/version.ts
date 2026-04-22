import apiClient from "./client";
import type { ApiResponse } from "@/types";

export interface ApiVersionPayload {
  name: string;
  version: string;
  description: string;
  releaseNotes: string;
}

export async function getApiVersion(): Promise<ApiVersionPayload> {
  const res = await apiClient.get<ApiResponse<ApiVersionPayload>>("/version");
  return res.data.data;
}
