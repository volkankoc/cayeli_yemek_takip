const db = require('../config/database');
const logger = require('../utils/logger');

function migrate() {
  logger.info('Running database migrations...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user','manager','operator','auditor')),
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
      phone TEXT,
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

    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      UNIQUE(role, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      event_key TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usage_logs_staff_meal_used_at ON usage_logs(staff_id, meal_type_id, used_at);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_used_at ON usage_logs(used_at);
    CREATE INDEX IF NOT EXISTS idx_sync_events_status_created_at ON sync_events(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
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
    ['unified_quota', 'false', 'Yemek haklarını tek havuzdan düş (tüm öğünler toplam kotadan)'],
    ['allowed_barcode_formats', 'EAN_13,CODE_128,QR_CODE', 'Desteklenen barkod formatları'],
    ['offline_queue_enabled', 'true', 'Offline kuyruk modu aktif'],
    ['offline_queue_max_size', '1000', 'Offline kuyruk maksimum kayıt sayısı'],
    ['sync_retry_interval_seconds', '15', 'Offline sync tekrar deneme süresi'],
    ['scanner_input_mode', 'camera', 'Okuyucu modu: camera, keyboard, serial, network'],
    ['scanner_network_endpoint', '', 'Network barkod okuyucu endpoint adresi'],
    ['scanner_serial_port', '', 'Serial barkod okuyucu port bilgisi'],
    ['scanner_heartbeat_seconds', '30', 'Cihaz heartbeat interval süresi'],
    ['password_min_length', '8', 'Minimum parola uzunluğu'],
    ['login_max_attempts', '10', 'Login için pencere başına maksimum deneme'],
    ['login_window_minutes', '10', 'Login deneme penceresi (dakika)'],
    ['report_default_range_days', '30', 'Rapor varsayılan gün aralığı'],
    ['data_retention_days', '365', 'İşlem logları saklama süresi (gün)'],
    ['alert_email', '', 'Kritik alarm e-posta adresi'],
    ['enable_metrics', 'true', 'Metrik endpoint aktif'],
  ];

  const insertMany = db.transaction(() => {
    for (const [key, value, description] of defaultSettings) {
      insertSetting.run(key, value, description);
    }
  });

  insertMany();

  const insertPermission = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)
  `);
  const permissionsByRole = {
    admin: ['settings.read', 'settings.write', 'users.manage', 'reports.read', 'reports.export', 'scan.execute'],
    manager: ['settings.read', 'reports.read', 'reports.export'],
    operator: ['scan.execute', 'reports.read'],
    auditor: ['reports.read', 'settings.read'],
    user: ['scan.execute'],
  };

  const insertPermissions = db.transaction(() => {
    for (const [role, permissions] of Object.entries(permissionsByRole)) {
      for (const permission of permissions) {
        insertPermission.run(role, permission);
      }
    }
  });
  insertPermissions();

  const staffColumns = db.prepare("PRAGMA table_info('staff')").all();
  const hasPhoneColumn = staffColumns.some((col) => col.name === 'phone');
  if (!hasPhoneColumn) {
    db.exec("ALTER TABLE staff ADD COLUMN phone TEXT");
  }

  logger.info('Database migrations completed successfully.');
}

module.exports = { migrate };
