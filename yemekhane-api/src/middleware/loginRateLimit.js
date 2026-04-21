const { error } = require('../utils/response');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const store = new Map();

function getKey(req) {
  const username = String(req.body?.username || '').toLowerCase();
  return `${req.ip}:${username}`;
}

function loginRateLimit(req, res, next) {
  const key = getKey(req);
  const now = Date.now();
  const entry = store.get(key) || { count: 0, startAt: now };

  if (now - entry.startAt > WINDOW_MS) {
    entry.count = 0;
    entry.startAt = now;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return error(res, 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.', 429);
  }

  entry.count += 1;
  store.set(key, entry);
  next();
}

function clearLoginAttempts(req) {
  store.delete(getKey(req));
}

module.exports = { loginRateLimit, clearLoginAttempts };
