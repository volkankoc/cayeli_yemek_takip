const fs = require('fs');
const path = require('path');
const db = require('../../config/database');
const env = require('../../config/env');
const logger = require('../../utils/logger');

const dbPath = path.resolve(env.DB_PATH);

function getBackupDir() {
  const dir = path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sqlQuotedFilePath(absPath) {
  const normalized = path.resolve(absPath).replace(/\\/g, '/');
  return `'${normalized.replace(/'/g, "''")}'`;
}

function vacuumInto(destAbsPath) {
  const tmp = `${destAbsPath}.tmp`;
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  db.exec(`VACUUM INTO ${sqlQuotedFilePath(tmp)}`);
  fs.renameSync(tmp, destAbsPath);
}

function isIgnoredBackupFile(name) {
  return (
    name.startsWith('.')
    || name === '_pending_restore.sqlite'
    || name.startsWith('_upload_')
    || name.endsWith('.tmp')
    || name === '_restore_apply.flag'
  );
}

function listBackups() {
  const dir = getBackupDir();
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.sqlite') && !isIgnoredBackupFile(n));
  return names
    .map((filename) => {
      const full = path.join(dir, filename);
      const st = fs.statSync(full);
      return { filename, size: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
}

function getRetentionDays() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'backup_retention_days'").get();
  const n = parseInt(row?.value || '14', 10);
  return Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : 14;
}

function pruneOldBackups() {
  const dir = getBackupDir();
  const retentionMs = getRetentionDays() * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  for (const { filename } of listBackups()) {
    if (filename.startsWith('pre_restore_')) continue;
    const full = path.join(dir, filename);
    const st = fs.statSync(full);
    if (st.mtimeMs < cutoff) {
      fs.unlinkSync(full);
      logger.info(`Eski yedek silindi: ${filename}`);
    }
  }
}

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hasBackupForLocalDate(dateStr) {
  const dir = getBackupDir();
  const prefix = `yemekhane-${dateStr}`;
  return fs.readdirSync(dir).some((n) => n.startsWith(prefix) && n.endsWith('.sqlite'));
}

/**
 * @param {'scheduled'|'manual'} source
 * @param {number|null} actorUserId
 */
function createBackupFile(source, actorUserId) {
  const dir = getBackupDir();
  const stamp = localDateString();
  const time = new Date().toISOString().replace(/[:.]/g, '-');
  const filename =
    source === 'manual' ? `yemekhane-${stamp}_manual_${time}.sqlite` : `yemekhane-${stamp}_auto.sqlite`;
  const dest = path.join(dir, filename);

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (e) {
    logger.warn('WAL checkpoint uyarısı', { message: e.message });
  }

  vacuumInto(dest);
  pruneOldBackups();

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAudit.run(
    actorUserId || null,
    'backup.created',
    'database',
    filename,
    JSON.stringify({ source, filename, path: dest })
  );

  logger.info(`Veritabanı yedeği oluşturuldu: ${filename} (${source})`);
  return { filename, path: dest, size: fs.statSync(dest).size };
}

function assertSafeBackupFilename(filename) {
  if (typeof filename !== 'string' || !filename.endsWith('.sqlite')) {
    const err = new Error('Geçersiz dosya adı');
    err.statusCode = 400;
    throw err;
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    const err = new Error('Geçersiz dosya adı');
    err.statusCode = 400;
    throw err;
  }
  if (isIgnoredBackupFile(filename)) {
    const err = new Error('Bu dosya indirilemez');
    err.statusCode = 400;
    throw err;
  }
}

function resolveBackupPath(filename) {
  assertSafeBackupFilename(filename);
  const full = path.join(getBackupDir(), filename);
  if (!fs.existsSync(full)) {
    const err = new Error('Yedek bulunamadı');
    err.statusCode = 404;
    throw err;
  }
  return full;
}

function validateSqliteFile(filePath) {
  const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');
  const buf = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (SQLITE_MAGIC.compare(buf, 0, 16, 0, 16) !== 0) {
    const err = new Error('Dosya geçerli bir SQLite veritabanı değil');
    err.statusCode = 400;
    throw err;
  }
  const testDb = require('better-sqlite3')(filePath, { readonly: true });
  try {
    const rows = testDb.prepare('PRAGMA quick_check').all();
    const cell = (r) => (r && (r.quick_check ?? Object.values(r)[0])) || '';
    const ok = rows.length > 0 && rows.every((r) => cell(r) === 'ok');
    if (!ok) {
      const err = new Error('SQLite bütünlük kontrolü başarısız');
      err.statusCode = 400;
      throw err;
    }
  } finally {
    testDb.close();
  }
}

function stageRestore(uploadedPath, actorUserId) {
  validateSqliteFile(uploadedPath);
  const dir = getBackupDir();
  const pending = path.join(dir, '_pending_restore.sqlite');
  const flag = path.join(dir, '_restore_apply.flag');

  fs.copyFileSync(uploadedPath, pending);
  fs.writeFileSync(flag, new Date().toISOString(), 'utf8');

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAudit.run(
    actorUserId || null,
    'backup.restore_pending',
    'database',
    'restore',
    JSON.stringify({ pending: path.basename(pending) })
  );

  logger.warn('Geri yükleme kuyruğa alındı; API yeniden başlatılmalı.');
}

module.exports = {
  getBackupDir,
  listBackups,
  createBackupFile,
  resolveBackupPath,
  vacuumInto,
  hasBackupForLocalDate,
  pruneOldBackups,
  stageRestore,
  validateSqliteFile,
  dbPath,
};
