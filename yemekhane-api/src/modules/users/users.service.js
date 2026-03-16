const bcrypt = require('bcrypt');
const db = require('../../config/database');

function getAll() {
  return db.prepare(
    'SELECT id, username, role, is_active, created_at FROM users ORDER BY id ASC'
  ).all();
}

function getById(id) {
  const user = db.prepare(
    'SELECT id, username, role, is_active, created_at FROM users WHERE id = ?'
  ).get(id);
  if (!user) throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
  return user;
}

function create({ username, password, role = 'user' }) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw Object.assign(new Error('Bu kullanıcı adı zaten kullanılıyor'), { statusCode: 409 });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username, password_hash, role);

  return getById(result.lastInsertRowid);
}

function update(id, data) {
  getById(id); // 404 kontrolü

  const fields = [];
  const params = [];

  if (data.username !== undefined) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(data.username, id);
    if (existing) throw Object.assign(new Error('Bu kullanıcı adı zaten kullanılıyor'), { statusCode: 409 });
    fields.push('username = ?'); params.push(data.username);
  }
  if (data.password !== undefined) {
    fields.push('password_hash = ?'); params.push(bcrypt.hashSync(data.password, 10));
  }
  if (data.role !== undefined) { fields.push('role = ?'); params.push(data.role); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }

  if (fields.length === 0) return getById(id);

  params.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getById(id);
}

function remove(id) {
  const user = getById(id); // 404 kontrolü
  // Son admin ise silmeyi engelle
  if (user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1").get();
    if (adminCount.count <= 1) {
      throw Object.assign(new Error('Son admin kullanıcısı silinemez'), { statusCode: 400 });
    }
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = { getAll, getById, create, update, remove };
