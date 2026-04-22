"use client";

import { useQuery } from "@tanstack/react-query";
import { getStaffList, getStaffById } from "@/lib/api/staff";

interface StaffFilters {
  department_id?: number;
  is_active?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useStaffList(filters: StaffFilters = {}) {
  return useQuery({
    queryKey: ["staff", filters],
    queryFn: () => getStaffList(filters),
    staleTime: 60 * 1000,
  });
}

export function useStaffDetail(id: number) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffById(id),
    staleTime: 60 * 1000,
    enabled: !!id,
  });
}
