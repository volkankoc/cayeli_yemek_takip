const { z } = require('zod');

const scanSchema = z.object({
  barcode: z.string().min(1, 'Barkod gerekli'),
  meal_type_id: z.number().int().positive('Geçerli yemek tipi ID gerekli'),
});

const cancelLastScanSchema = z.object({
  meal_type_id: z.number().int().positive('Geçerli yemek tipi ID gerekli').optional(),
});

const cancelScanSchema = z.object({
  usage_log_id: z.number().int().positive('Geçerli okutma ID gerekli'),
});

module.exports = { scanSchema, cancelLastScanSchema, cancelScanSchema };
