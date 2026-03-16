const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../utils/logger');

function setupMonthlyReset() {
  // Run at 00:01 on the 1st of every month
  cron.schedule('1 0 1 * *', () => {
    try {
      logger.info('Monthly quota reset job started');

      // Get default quota
      const defaultQuota = parseInt(
        db.prepare("SELECT value FROM settings WHERE key = 'monthly_quota'").get()?.value || '22',
        10
      );

      // Count active staff
      const activeStaffCount = db.prepare('SELECT COUNT(*) as count FROM staff WHERE is_active = 1').get().count;

      // Log the refresh
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO quota_refresh_logs (refresh_date, quota_given, affected_staff_count)
        VALUES (?, ?, ?)
      `).run(today, defaultQuota, activeStaffCount);

      logger.info(`Monthly quota reset completed. Quota: ${defaultQuota}, Affected staff: ${activeStaffCount}`);
    } catch (err) {
      logger.error('Monthly reset job failed:', { error: err.message, stack: err.stack });
    }
  });

  logger.info('Monthly reset cron job scheduled (1st of each month at 00:01)');
}

module.exports = { setupMonthlyReset };
