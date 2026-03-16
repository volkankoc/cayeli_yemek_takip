const db = require('../../config/database');

function getAll() {
  return db.prepare('SELECT * FROM settings ORDER BY key').all();
}

function getFormatted() {
  const rows = getAll();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

function update(keyValuePairs) {
  const updateStmt = db.prepare(`
    UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?
  `);

  const updateAll = db.transaction(() => {
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key);
      if (existing) {
        updateStmt.run(String(value), key);
      }
    }
  });

  updateAll();
  return getFormatted();
}

module.exports = { getAll, getFormatted, update };
