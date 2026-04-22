import apiClient from "./client";
import type { ApiResponse, AuditLog, PaginatedData } from "@/types";

export async function getAuditLogs(params: { page?: number; limit?: number; action?: string; entity_type?: string } = {}): Promise<PaginatedData<AuditLog>> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.action) search.set("action", params.action);
  if (params.entity_type) search.set("entity_type", params.entity_type);
  const res = await apiClient.get<ApiResponse<PaginatedData<AuditLog>>>(`/logs?${search.toString()}`);
  return res.data.data;
}
