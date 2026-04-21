const { z } = require('zod');

const createStaffSchema = z.object({
  barcode: z.string().min(1, 'Barkod gerekli'),
  first_name: z.string().min(1, 'İsim gerekli'),
  last_name: z.string().min(1, 'Soyisim gerekli'),
  department_id: z.number().int().positive('Geçerli departman ID gerekli'),
  phone: z.string().min(5, 'Cep telefonu geçerli olmalı').max(20).optional().or(z.literal('')),
});

const updateStaffSchema = z.object({
  barcode: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  department_id: z.number().int().positive().optional(),
  phone: z.string().min(5).max(20).optional().or(z.literal('')),
  is_active: z.number().int().min(0).max(1).optional(),
});

const updateMealRightsSchema = z.object({
  rights: z.array(
    z.object({
      meal_type_id: z.number().int().positive('Geçerli yemek tipi ID gerekli'),
      monthly_quota: z.number().int().min(0, 'Kota 0 veya üzeri olmalı'),
    })
  ).min(1, 'En az bir yemek hakkı gerekli'),
});

const bulkImportStaffSchema = z.object({
  staff: z.array(createStaffSchema).min(1, 'En az bir personel gerekli'),
});

module.exports = { createStaffSchema, updateStaffSchema, updateMealRightsSchema, bulkImportStaffSchema };
