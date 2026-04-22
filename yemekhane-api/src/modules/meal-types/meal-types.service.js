const db = require('../../config/database');

function getAll() {
  return db.prepare('SELECT * FROM meal_types ORDER BY name').all();
}

function getById(id) {
  return db.prepare('SELECT * FROM meal_types WHERE id = ?').get(id);
}

function create(name, dailyLimit) {
  const result = db
    .prepare('INSERT INTO meal_types (name, daily_limit) VALUES (?, ?)')
    .run(name, dailyLimit);
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
  if (data.daily_limit !== undefined) { fields.push('daily_limit = ?'); params.push(data.daily_limit); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }

  if (fields.length === 0) return getById(id);

  params.push(id);
  db.prepare(`UPDATE meal_types SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getById(id);
}

module.exports = { getAll, getById, create, update };
