const db = require('../../config/database');

function getAll(year) {
  if (year) {
    return db.prepare("SELECT * FROM holidays WHERE strftime('%Y', date) = ? ORDER BY date").all(String(year));
  }
  const currentYear = new Date().getFullYear();
  return db.prepare("SELECT * FROM holidays WHERE strftime('%Y', date) = ? ORDER BY date").all(String(currentYear));
}

function getById(id) {
  return db.prepare('SELECT * FROM holidays WHERE id = ?').get(id);
}

function getByDate(date) {
  return db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
}

function create(date, description) {
  const result = db.prepare('INSERT INTO holidays (date, description) VALUES (?, ?)').run(date, description);
  return getById(result.lastInsertRowid);
}

function remove(id) {
  db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
}

module.exports = { getAll, getById, getByDate, create, remove };
