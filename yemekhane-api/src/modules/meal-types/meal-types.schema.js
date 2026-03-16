const { z } = require('zod');

const createMealTypeSchema = z.object({
  name: z.string().min(1, 'Yemek tipi adı gerekli'),
  daily_limit: z.number().int().min(1, 'Günlük limit en az 1 olmalı').default(1),
});

const updateMealTypeSchema = z.object({
  name: z.string().min(1).optional(),
  daily_limit: z.number().int().min(1).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

module.exports = { createMealTypeSchema, updateMealTypeSchema };
