const authService = require('./auth.service');
const { success, error } = require('../../utils/response');

/**
 * POST /api/auth/login
 */
function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = authService.login(username, password);
    return success(res, result, 'Giriş başarılı');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  // JWT is stateless, client should discard token
  return success(res, null, 'Çıkış başarılı');
}

/**
 * GET /api/auth/me
 */
function me(req, res, next) {
  try {
    const user = authService.getMe(req.user.id);
    return success(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me };
