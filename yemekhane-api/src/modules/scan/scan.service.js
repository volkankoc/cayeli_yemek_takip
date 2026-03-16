const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Get a setting value by key
 * @param {string} key
 * @returns {string|null}
 */
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

/**
 * Process a barcode scan
 * @param {string} barcode
 * @param {number} mealTypeId
 * @param {number} userId - The authenticated user who is scanning
 */
function processScan(barcode, mealTypeId, userId) {
  // 1. Find staff by barcode
  const staff = db.prepare(`
    SELECT s.*, d.name as department_name
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.barcode = ?
  `).get(barcode);

  if (!staff) {
    return {
      success: false,
      message: 'Personel bulunamadı. Barkod geçersiz.',
      statusCode: 404,
    };
  }

  // 2. Check if staff is active
  if (!staff.is_active) {
    return {
      success: false,
      message: 'Personel aktif değil.',
      staff: formatStaff(staff),
      statusCode: 400,
    };
  }

  // 3. Check meal type exists and is active
  const mealType = db.prepare('SELECT * FROM meal_types WHERE id = ? AND is_active = 1').get(mealTypeId);
  if (!mealType) {
    return {
      success: false,
      message: 'Geçersiz veya aktif olmayan yemek tipi.',
      staff: formatStaff(staff),
      statusCode: 400,
    };
  }

  // Get today's date info
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // 4. Check if today is a holiday
  const holiday = db.prepare('SELECT * FROM holidays WHERE date = ?').get(today);
  const isHoliday = !!holiday;

  // 5. Check weekend restriction
  const weekendRestriction = getSetting('weekend_restriction');
  if ((dayOfWeek === 0 || dayOfWeek === 6) && weekendRestriction === 'true') {
    return {
      success: false,
      message: 'Hafta sonu yemek hizmeti kısıtlanmıştır.',
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      is_holiday: isHoliday,
      holiday_name: holiday ? holiday.description : undefined,
      statusCode: 400,
    };
  }

  // 6. Check scan cooldown
  const cooldownMinutes = parseInt(getSetting('scan_cooldown_minutes') || '0', 10);
  if (cooldownMinutes > 0) {
    const lastScan = db.prepare(`
      SELECT used_at FROM usage_logs
      WHERE staff_id = ? AND meal_type_id = ?
      ORDER BY used_at DESC LIMIT 1
    `).get(staff.id, mealTypeId);

    if (lastScan) {
      const lastScanTime = new Date(lastScan.used_at + 'Z');
      const diffMs = now.getTime() - lastScanTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < cooldownMinutes) {
        const remainingMinutes = Math.ceil(cooldownMinutes - diffMinutes);
        return {
          success: false,
          message: `Son okutmadan bu yana yeterli süre geçmedi. ${remainingMinutes} dakika sonra tekrar deneyin.`,
          staff: formatStaff(staff),
          meal_type: { id: mealType.id, name: mealType.name },
          is_holiday: isHoliday,
          holiday_name: holiday ? holiday.description : undefined,
          statusCode: 429,
        };
      }
    }
  }

  // 7. Check monthly quota
  const staffMealRight = db.prepare(`
    SELECT monthly_quota FROM staff_meal_rights
    WHERE staff_id = ? AND meal_type_id = ?
  `).get(staff.id, mealTypeId);

  const defaultQuota = parseInt(getSetting('monthly_quota') || '22', 10);
  const monthlyQuota = staffMealRight ? staffMealRight.monthly_quota : defaultQuota;

  // 8. Count monthly usage
  const monthlyUsage = db.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE staff_id = ? AND meal_type_id = ? AND strftime('%Y-%m', used_at) = ?
  `).get(staff.id, mealTypeId, yearMonth);

  const monthlyUsed = monthlyUsage.count;

  if (monthlyUsed >= monthlyQuota) {
    return {
      success: false,
      message: 'Aylık yemek hakkı dolmuştur.',
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      usage: {
        monthly_used: monthlyUsed,
        monthly_quota: monthlyQuota,
        monthly_remaining: 0,
        daily_used: getDailyUsage(staff.id, mealTypeId, today),
        daily_limit: mealType.daily_limit,
      },
      is_holiday: isHoliday,
      holiday_name: holiday ? holiday.description : undefined,
      statusCode: 400,
    };
  }

  // 9. Check daily limit
  const dailyUsed = getDailyUsage(staff.id, mealTypeId, today);

  if (dailyUsed >= mealType.daily_limit) {
    return {
      success: false,
      message: `Günlük ${mealType.name} limiti dolmuştur.`,
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      usage: {
        monthly_used: monthlyUsed,
        monthly_quota: monthlyQuota,
        monthly_remaining: monthlyQuota - monthlyUsed,
        daily_used: dailyUsed,
        daily_limit: mealType.daily_limit,
      },
      is_holiday: isHoliday,
      holiday_name: holiday ? holiday.description : undefined,
      statusCode: 400,
    };
  }

  // 10. All checks passed — record usage
  db.prepare(`
    INSERT INTO usage_logs (staff_id, meal_type_id, created_by_user_id)
    VALUES (?, ?, ?)
  `).run(staff.id, mealTypeId, userId);

  logger.info(`Scan recorded: Staff ${staff.id} (${staff.first_name} ${staff.last_name}), Meal: ${mealType.name}`, {
    staffId: staff.id,
    mealTypeId,
    userId,
  });

  return {
    success: true,
    message: isHoliday
      ? `Yemek kaydı oluşturuldu. Not: Bugün tatil (${holiday.description}).`
      : 'Yemek kaydı başarıyla oluşturuldu.',
    staff: formatStaff(staff),
    meal_type: { id: mealType.id, name: mealType.name },
    usage: {
      monthly_used: monthlyUsed + 1,
      monthly_quota: monthlyQuota,
      monthly_remaining: monthlyQuota - monthlyUsed - 1,
      daily_used: dailyUsed + 1,
      daily_limit: mealType.daily_limit,
    },
    is_holiday: isHoliday,
    holiday_name: holiday ? holiday.description : undefined,
    statusCode: 200,
  };
}

/**
 * Get daily usage count for a staff member for a specific meal type
 */
function getDailyUsage(staffId, mealTypeId, date) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE staff_id = ? AND meal_type_id = ? AND date(used_at) = ?
  `).get(staffId, mealTypeId, date);
  return result.count;
}

/**
 * Format staff data for response
 */
function formatStaff(staff) {
  return {
    id: staff.id,
    full_name: `${staff.first_name} ${staff.last_name}`,
    photo_url: staff.photo_url,
    department: staff.department_name,
  };
}

module.exports = { processScan };
