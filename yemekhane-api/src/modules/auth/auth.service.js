const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const env = require('../../config/env');

/**
 * @param {string} username
 * @param {string} password
 * @returns {{ token: string, user: { id: number, username: string, role: string } }}
 */
function login(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user) {
    throw Object.assign(new Error('Geçersiz kullanıcı adı veya şifre'), { statusCode: 401 });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Geçersiz kullanıcı adı veya şifre'), { statusCode: 401 });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

/**
 * @param {number} userId
 * @returns {{ id: number, username: string, role: string }}
 */
function getMe(userId) {
  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ? AND is_active = 1').get(userId);
  if (!user) {
    throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
  }
  return user;
}

module.exports = { login, getMe };
