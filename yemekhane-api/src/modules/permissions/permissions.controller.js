const { z } = require('zod');
const { success } = require('../../utils/response');
const service = require('./permissions.service');

const updateSchema = z.object({
  role: z.string().min(1),
  permissions: z.array(z.string().min(3)).max(50),
});

function getMatrix(req, res, next) {
  try {
    return success(res, service.getMatrix());
  } catch (err) {
    next(err);
  }
}

function updateRole(req, res, next) {
  try {
    const parsed = updateSchema.parse(req.body);
    const matrix = service.replaceRolePermissions(parsed.role, parsed.permissions, req.user?.id);
    return success(res, matrix, 'Rol izinleri güncellendi');
  } catch (err) {
    err.statusCode = err.statusCode || 400;
    next(err);
  }
}

module.exports = { getMatrix, updateRole };
