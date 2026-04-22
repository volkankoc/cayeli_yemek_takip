const db = require('../../config/database');
const logger = require('../../utils/logger');
const metrics = require('../../utils/metrics');

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
  const normalizedBarcode = normalizeBarcode(barcode);

  // 1. Find staff by barcode
  const staff = db.prepare(`
    SELECT s.*, d.name as department_name
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.barcode = ?
  `).get(normalizedBarcode);

  if (!staff) {
    metrics.inc('scan_failure_total');
    return {
      success: false,
      message: 'Personel bulunamadı. Barkod geçersiz.',
      statusCode: 404,
    };
  }

  // 2. Check if staff is active
  if (!staff.is_active) {
    metrics.inc('scan_failure_total');
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
    metrics.inc('scan_failure_total');
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
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // 4. Check weekend restriction
  const weekendRestriction = getSetting('weekend_restriction');
  if ((dayOfWeek === 0 || dayOfWeek === 6) && weekendRestriction === 'true') {
    metrics.inc('scan_failure_total');
    return {
      success: false,
      message: 'Hafta sonu yemek hizmeti kısıtlanmıştır.',
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      statusCode: 400,
    };
  }

  // 5. Check scan cooldown
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
        metrics.inc('scan_failure_total');
        const remainingMinutes = Math.ceil(cooldownMinutes - diffMinutes);
        return {
          success: false,
          message: `Son okutmadan bu yana yeterli süre geçmedi. ${remainingMinutes} dakika sonra tekrar deneyin.`,
          staff: formatStaff(staff),
          meal_type: { id: mealType.id, name: mealType.name },
          statusCode: 429,
        };
      }
    }
  }

  // 6. Kontür kontrolü
  const isInstitutional = Number(staff.is_institutional || 0) === 1;
  const currentBalance = Number(staff.balance || 0);
  const debitAmount = isInstitutional ? 0 : 1;

  if (isInstitutional && getDailyTotalUsage(staff.id, today) >= 1) {
    metrics.inc('scan_failure_total');
    return {
      success: false,
      message: 'Kurum personeli için günlük 1 yemek hakkı kullanılmış.',
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      usage: {
        balance_before: currentBalance,
        balance_after: currentBalance,
        debit_amount: 0,
        daily_used: 1,
        daily_limit: 1,
      },
      statusCode: 400,
    };
  }

  if (!isInstitutional && currentBalance < debitAmount) {
    metrics.inc('scan_failure_total');
    return {
      success: false,
      message: 'Yetersiz kontür. 1 okutma için 1 kontür gerekli.',
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      usage: {
        balance_before: currentBalance,
        balance_after: currentBalance,
        debit_amount: debitAmount,
        daily_used: getDailyUsage(staff.id, mealTypeId, today),
        daily_limit: mealType.daily_limit,
      },
      statusCode: 400,
    };
  }

  // 7. Check daily limit
  const dailyUsed = getDailyUsage(staff.id, mealTypeId, today);

  if (dailyUsed >= mealType.daily_limit) {
    metrics.inc('scan_failure_total');
    return {
      success: false,
      message: `Günlük ${mealType.name} limiti dolmuştur.`,
      staff: formatStaff(staff),
      meal_type: { id: mealType.id, name: mealType.name },
      usage: {
        balance_before: currentBalance,
        balance_after: currentBalance,
        debit_amount: debitAmount,
        daily_used: dailyUsed,
        daily_limit: mealType.daily_limit,
      },
      statusCode: 400,
    };
  }

  // 8. All checks passed — record usage + düşüm
  let insertResult;
  db.transaction(() => {
    insertResult = db.prepare(`
      INSERT INTO usage_logs (staff_id, meal_type_id, created_by_user_id)
      VALUES (?, ?, ?)
    `).run(staff.id, mealTypeId, userId);
    if (!isInstitutional) {
      db.prepare("UPDATE staff SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?")
        .run(debitAmount, staff.id);
      db.prepare(`
        INSERT INTO credit_transactions (staff_id, amount, note, created_by_user_id)
        VALUES (?, ?, ?, ?)
      `).run(staff.id, -debitAmount, `scan:${mealType.name}`, userId || null);
    }
  })();
  metrics.inc('scan_success_total');

  logger.info(`Scan recorded: Staff ${staff.id} (${staff.first_name} ${staff.last_name}), Meal: ${mealType.name}`, {
    staffId: staff.id,
    mealTypeId,
    userId,
  });

  return {
    success: true,
    message: 'Yemek kaydı başarıyla oluşturuldu.',
    staff: formatStaff(staff),
    meal_type: { id: mealType.id, name: mealType.name },
    usage: {
      balance_before: currentBalance,
      balance_after: currentBalance - debitAmount,
      debit_amount: debitAmount,
      daily_used: isInstitutional ? 1 : (dailyUsed + 1),
      daily_limit: isInstitutional ? 1 : mealType.daily_limit,
    },
    usage_log_id: Number(insertResult.lastInsertRowid),
    statusCode: 200,
  };
}

function cancelLastScan(userId, mealTypeId) {
  const row = mealTypeId
    ? db.prepare(`
      SELECT ul.id, ul.staff_id, ul.meal_type_id, ul.used_at,
             s.first_name, s.last_name, d.name as department_name,
             mt.name as meal_type_name
      FROM usage_logs ul
      JOIN staff s ON s.id = ul.staff_id
      LEFT JOIN departments d ON d.id = s.department_id
      JOIN meal_types mt ON mt.id = ul.meal_type_id
      WHERE ul.created_by_user_id = ? AND ul.meal_type_id = ?
      ORDER BY ul.id DESC
      LIMIT 1
    `).get(userId, mealTypeId)
    : db.prepare(`
      SELECT ul.id, ul.staff_id, ul.meal_type_id, ul.used_at,
             s.first_name, s.last_name, d.name as department_name,
             mt.name as meal_type_name
      FROM usage_logs ul
      JOIN staff s ON s.id = ul.staff_id
      LEFT JOIN departments d ON d.id = s.department_id
      JOIN meal_types mt ON mt.id = ul.meal_type_id
      WHERE ul.created_by_user_id = ?
      ORDER BY ul.id DESC
      LIMIT 1
    `).get(userId);

  if (!row) {
    return {
      success: false,
      message: 'İptal edilecek işlem bulunamadı.',
      statusCode: 404,
    };
  }

  return cancelScanRow(row, userId, 'Son işlem iptal edildi.');
}

function cancelScanByUsageId(userId, usageLogId) {
  const row = db.prepare(`
    SELECT ul.id, ul.staff_id, ul.meal_type_id, ul.used_at,
           s.first_name, s.last_name, d.name as department_name,
           mt.name as meal_type_name
    FROM usage_logs ul
    JOIN staff s ON s.id = ul.staff_id
    LEFT JOIN departments d ON d.id = s.department_id
    JOIN meal_types mt ON mt.id = ul.meal_type_id
    WHERE ul.id = ? AND ul.created_by_user_id = ?
    LIMIT 1
  `).get(usageLogId, userId);

  if (!row) {
    return {
      success: false,
      message: 'İptal edilecek okutma bulunamadı.',
      statusCode: 404,
    };
  }

  return cancelScanRow(row, userId, 'Seçili okutma iptal edildi.');
}

function cancelScanRow(row, userId, message) {
  db.transaction(() => {
    db.prepare('DELETE FROM usage_logs WHERE id = ?').run(row.id);
    const staffRow = db.prepare('SELECT is_institutional FROM staff WHERE id = ?').get(row.staff_id);
    const isInstitutional = Number(staffRow?.is_institutional || 0) === 1;
    if (!isInstitutional) {
      db.prepare("UPDATE staff SET balance = balance + 1, updated_at = datetime('now') WHERE id = ?")
        .run(row.staff_id);
      db.prepare(`
        INSERT INTO credit_transactions (staff_id, amount, note, created_by_user_id)
        VALUES (?, ?, ?, ?)
      `).run(row.staff_id, 1, `scan_cancel:${row.meal_type_name}`, userId || null);
    }
  })();

  return {
    success: true,
    message,
    canceled: {
      id: row.id,
      used_at: row.used_at,
      meal_type_id: row.meal_type_id,
      meal_type_name: row.meal_type_name,
      staff: {
        id: row.staff_id,
        full_name: `${row.first_name} ${row.last_name}`,
        department: row.department_name || '',
      },
    },
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

function getDailyTotalUsage(staffId, date) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE staff_id = ? AND date(used_at) = ?
  `).get(staffId, date);
  return result.count;
}

function normalizeBarcode(rawBarcode) {
  const input = String(rawBarcode || '').trim();
  if (!input) return '';

  // Priority: use first 11-digit sequence (e.g. "12345678901 12345")
  const directEleven = input.match(/\d{11}/);
  if (directEleven) return directEleven[0];

  // Fallback: collect digits and use first 11 if available.
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length >= 11) return digitsOnly.slice(0, 11);

  // Final fallback for legacy/non-digit barcodes.
  return input.split(/\s+/)[0];
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
    balance: Number(staff.balance || 0),
    is_institutional: Number(staff.is_institutional || 0),
  };
}

module.exports = { processScan, cancelLastScan, cancelScanByUsageId };
