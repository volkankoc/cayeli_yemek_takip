import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Departman adı gerekli"),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;
