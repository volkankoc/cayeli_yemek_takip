"use client";

import { useQuery } from "@tanstack/react-query";
import { getMealTypes } from "@/lib/api/meal-types";

export function useMealTypes() {
  return useQuery({
    queryKey: ["mealTypes"],
    queryFn: getMealTypes,
    staleTime: 60 * 1000,
  });
}
