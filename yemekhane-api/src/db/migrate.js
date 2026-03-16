const db = require('../config/database');
const logger = require('../utils/logger');

function migrate() {
  logger.info('Running database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      photo_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      daily_limit INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff_meal_rights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      meal_type_id INTEGER NOT NULL REFERENCES meal_types(id),
      monthly_quota INTEGER NOT NULL,
      UNIQUE(staff_id, meal_type_id)
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL REFERENCES staff(id),
      meal_type_id INTEGER NOT NULL REFERENCES meal_types(id),
      used_at TEXT DEFAULT (datetime('now')),
      created_by_user_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quota_refresh_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refresh_date TEXT NOT NULL,
      quota_given INTEGER NOT NULL,
      affected_staff_count INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Insert default settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
  `);

  const defaultSettings = [
    ['monthly_quota', '22', 'Varsayılan aylık yemek hak sayısı'],
    ['scan_cooldown_minutes', '0', 'Ardışık okutma arasındaki minimum dakika'],
    ['weekend_restriction', 'false', 'Hafta sonu yemek kısıtlaması'],
    ['session_timeout_hours', '8', 'Oturum zaman aşımı (saat)'],
    ['system_name', 'Yemekhane Takip Sistemi', 'Sistem adı'],
  ];

  const insertMany = db.transaction(() => {
    for (const [key, value, description] of defaultSettings) {
      insertSetting.run(key, value, description);
    }
  });

  insertMany();

  logger.info('Database migrations completed successfully.');
}

module.exports = { migrate };
