const db = require('../../config/database');

function getAll() {
  return db.prepare('SELECT * FROM departments ORDER BY name').all();
}

function getById(id) {
  return db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
}

function create(name) {
  const result = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
  return getById(result.lastInsertRowid);
}

function update(id, name) {
  db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, id);
  return getById(id);
}

function remove(id) {
  // Check if department has staff
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff WHERE department_id = ?').get(id);
  if (staffCount.count > 0) {
    throw Object.assign(new Error('Bu departmanda personel bulunmaktadır. Önce personelleri başka departmana taşıyın.'), { statusCode: 400 });
  }
  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
}

module.exports = { getAll, getById, create, update, remove };
