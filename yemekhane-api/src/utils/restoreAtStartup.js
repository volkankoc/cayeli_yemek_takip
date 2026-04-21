const fs = require('fs');
const path = require('path');

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

/**
 * Bekleyen veritabanı geri yükleme dosyasını uygular (sunucu kapalıyken kopyalanmış dosya).
 * better-sqlite3 bağlantısı açılmadan önce çağrılmalıdır.
 * @param {string} dbPath - Mutlak veritabanı dosya yolu
 */
function applyPendingDatabaseRestore(dbPath) {
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  const flagPath = path.join(backupDir, '_restore_apply.flag');
  const pendingPath = path.join(backupDir, '_pending_restore.sqlite');

  if (!fs.existsSync(flagPath) || !fs.existsSync(pendingPath)) {
    return;
  }

  const buf = Buffer.alloc(16);
  const fd = fs.openSync(pendingPath, 'r');
  try {
    fs.readSync(fd, buf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (SQLITE_MAGIC.compare(buf, 0, 16, 0, 16) !== 0) {
    fs.unlinkSync(flagPath);
    return;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(dbPath)) {
    const pre = path.join(backupDir, `pre_restore_${ts}.sqlite`);
    fs.copyFileSync(dbPath, pre);
  }

  fs.copyFileSync(pendingPath, dbPath);
  fs.unlinkSync(pendingPath);
  fs.unlinkSync(flagPath);

  for (const ext of ['-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + ext);
    } catch {
      /* yoksa sorun değil */
    }
  }
}

module.exports = { applyPendingDatabaseRestore };
