import { z } from "zod";

export const mealTypeSchema = z.object({
  name: z.string().min(1, "Yemek tipi adı gerekli"),
  daily_limit: z.coerce.number().min(1, "Günlük limit en az 1 olmalı"),
});

export type MealTypeFormData = z.infer<typeof mealTypeSchema>;
