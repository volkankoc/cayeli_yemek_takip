const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../utils/logger');
const backupsService = require('../modules/backups/backups.service');

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function maybeRunScheduledBackup() {
  try {
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'auto_backup_enabled'").get()?.value === 'true';
    if (!enabled) return;

    const hour = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'auto_backup_hour'").get()?.value || '3', 10);
    const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 3;
    const now = new Date();
    if (now.getHours() !== h) return;

    const today = localDateString(now);
    if (backupsService.hasBackupForLocalDate(today)) return;

    backupsService.createBackupFile('scheduled', null);
  } catch (err) {
    logger.error('Zamanlanmış yedekleme hatası', { error: err.message, stack: err.stack });
  }
}

function setupDailyBackup() {
  cron.schedule('5 * * * *', maybeRunScheduledBackup);
  logger.info('Günlük yedekleme cron zamanlandı (her saat :05, sunucu saati)');
}

module.exports = { setupDailyBackup, maybeRunScheduledBackup };
