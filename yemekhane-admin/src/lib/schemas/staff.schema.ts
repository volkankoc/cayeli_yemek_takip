import { z } from "zod";

export const staffSchema = z.object({
  barcode: z.string().min(1, "Barkod gerekli"),
  first_name: z.string().min(1, "İsim gerekli"),
  last_name: z.string().min(1, "Soyisim gerekli"),
  department_id: z.number().min(1, "Departman seçimi gerekli"),
  phone: z.string().min(5, "Cep telefonu geçerli olmalı").optional().or(z.literal("")),
});

export const updateStaffSchema = z.object({
  barcode: z.string().min(1, "Barkod gerekli"),
  first_name: z.string().min(1, "İsim gerekli"),
  last_name: z.string().min(1, "Soyisim gerekli"),
  department_id: z.number().min(1, "Departman seçimi gerekli"),
  phone: z.string().min(5, "Cep telefonu geçerli olmalı").optional().or(z.literal("")),
  is_active: z.number().optional(),
});

export type StaffFormData = z.infer<typeof staffSchema>;
export type UpdateStaffFormData = z.infer<typeof updateStaffSchema>;
