const db = require('../../config/database');
const { settingsUpdateSchema } = require('./settings.schema');

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

function update(keyValuePairs, actorUserId) {
  const parsed = settingsUpdateSchema.safeParse(keyValuePairs);
  if (!parsed.success) {
    const err = new Error('Ayar doğrulama hatası');
    err.statusCode = 400;
    err.details = parsed.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw err;
  }

  const cleanPairs = parsed.data;
  const updateStmt = db.prepare(`
    UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?
  `);
  const insertAuditStmt = db.prepare(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateAll = db.transaction(() => {
    for (const [key, value] of Object.entries(cleanPairs)) {
      const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key);
      if (existing) {
        updateStmt.run(value, key);
        insertAuditStmt.run(
          actorUserId || null,
          'settings.update',
          'settings',
          key,
          JSON.stringify({ key, value })
        );
      }
    }
  });

  updateAll();
  return getFormatted();
}

module.exports = { getAll, getFormatted, update };
