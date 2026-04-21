const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../utils/logger');

function runMonthlyReset() {
  logger.info('Monthly quota reset job started');

  // Get default quota from settings
  const defaultQuota = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'monthly_quota'").get()?.value || '22',
    10
  );

  const activeStaff = db.prepare('SELECT id FROM staff WHERE is_active = 1').all();
  const activeMealTypes = db.prepare('SELECT id FROM meal_types WHERE is_active = 1').all();

  const upsertRight = db.prepare(`
    INSERT INTO staff_meal_rights (staff_id, meal_type_id, monthly_quota)
    VALUES (?, ?, ?)
    ON CONFLICT(staff_id, meal_type_id)
    DO UPDATE SET monthly_quota = excluded.monthly_quota
  `);

  const tx = db.transaction(() => {
    for (const staff of activeStaff) {
      for (const mealType of activeMealTypes) {
        upsertRight.run(staff.id, mealType.id, defaultQuota);
      }
    }
  });
  tx();

  const affectedStaffCount = activeStaff.length;
  const updatedRightsCount = affectedStaffCount * activeMealTypes.length;
  const today = new Date().toISOString().split('T')[0];

  // Keep monthly reset history
  db.prepare(`
    INSERT INTO quota_refresh_logs (refresh_date, quota_given, affected_staff_count)
    VALUES (?, ?, ?)
  `).run(today, defaultQuota, affectedStaffCount);

  logger.info(
    `Monthly quota reset completed. Quota: ${defaultQuota}, Staff: ${affectedStaffCount}, Rights updated: ${updatedRightsCount}`
  );
}

function setupMonthlyReset() {
  // Run at 00:01 on the 1st of every month
  cron.schedule('1 0 1 * *', () => {
    try {
      runMonthlyReset();
    } catch (err) {
      logger.error('Monthly reset job failed:', { error: err.message, stack: err.stack });
    }
  });

  logger.info('Monthly reset cron job scheduled (1st of each month at 00:01)');
}

module.exports = { setupMonthlyReset, runMonthlyReset };
