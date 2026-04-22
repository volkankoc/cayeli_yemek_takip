"use client";

import { useQuery } from "@tanstack/react-query";
import { getDepartments } from "@/lib/api/departments";

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: getDepartments,
    staleTime: 60 * 1000,
  });
}
