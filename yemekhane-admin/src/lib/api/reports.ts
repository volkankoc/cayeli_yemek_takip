import apiClient from "./client";
import type { ApiResponse, DailyReport, MonthlyReport, YearlyReport, StaffReport } from "@/types";

export async function getDailyReport(date?: string): Promise<DailyReport> {
  const params = date ? `?date=${date}` : "";
  const res = await apiClient.get<ApiResponse<DailyReport>>(`/reports/daily${params}`);
  return res.data.data;
}

export async function getMonthlyReport(year?: number, month?: number): Promise<MonthlyReport> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const res = await apiClient.get<ApiResponse<MonthlyReport>>(`/reports/monthly?${params.toString()}`);
  return res.data.data;
}

export async function getYearlyReport(year?: number): Promise<YearlyReport> {
  const params = year ? `?year=${year}` : "";
  const res = await apiClient.get<ApiResponse<YearlyReport>>(`/reports/yearly${params}`);
  return res.data.data;
}

export async function getStaffReport(id: number, year?: number, month?: number): Promise<StaffReport> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const res = await apiClient.get<ApiResponse<StaffReport>>(`/reports/staff/${id}?${params.toString()}`);
  return res.data.data;
}

export async function exportMonthlyExcel(year?: number, month?: number): Promise<Blob> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const res = await apiClient.get(`/reports/export/monthly?${params.toString()}`, {
    responseType: "blob",
  });
  return res.data;
}

export async function exportYearlyExcel(year?: number): Promise<Blob> {
  const params = year ? `?year=${year}` : "";
  const res = await apiClient.get(`/reports/export/yearly${params}`, {
    responseType: "blob",
  });
  return res.data;
}
