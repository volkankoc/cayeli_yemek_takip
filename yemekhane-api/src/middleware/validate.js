const { error } = require('../utils/response');

/**
 * Create a validation middleware using a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return error(res, 'Doğrulama hatası', 400, details);
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
