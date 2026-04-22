"use client";

import { useQuery } from "@tanstack/react-query";
import { getDailyReport, getMonthlyReport, getYearlyReport, getStaffReport } from "@/lib/api/reports";

export function useDailyReport(date?: string) {
  return useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => getDailyReport(date),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyReport(year?: number, month?: number) {
  return useQuery({
    queryKey: ["reports", "monthly", year, month],
    queryFn: () => getMonthlyReport(year, month),
    staleTime: 5 * 60 * 1000,
  });
}

export function useYearlyReport(year?: number) {
  return useQuery({
    queryKey: ["reports", "yearly", year],
    queryFn: () => getYearlyReport(year),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffReport(id: number, year?: number, month?: number) {
  return useQuery({
    queryKey: ["reports", "staff", id, year, month],
    queryFn: () => getStaffReport(id, year, month),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
