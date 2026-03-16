const { z } = require('zod');

const scanSchema = z.object({
  barcode: z.string().min(1, 'Barkod gerekli'),
  meal_type_id: z.number().int().positive('Geçerli yemek tipi ID gerekli'),
});

module.exports = { scanSchema };
