const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/response');
const db = require('../config/database');

/**
 * Authenticate JWT token from Authorization header
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Yetkilendirme token\'ı gerekli', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return error(res, 'Geçersiz veya süresi dolmuş token', 401);
  }
}

/**
 * Require admin role
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return error(res, 'Bu işlem için admin yetkisi gerekli', 403);
  }
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Yetkilendirme gerekli', 401);
    if (req.user.role === 'admin') return next();

    const allowed = db.prepare(
      'SELECT 1 FROM role_permissions WHERE role = ? AND permission = ?'
    ).get(req.user.role, permission);

    if (!allowed) {
      return error(res, 'Bu işlem için yetkiniz yok', 403);
    }
    next();
  };
}

module.exports = { authenticate, requireAdmin, requirePermission };
