const db = require('../../config/database');
const ExcelJS = require('exceljs');

/**
 * GET /api/reports/daily
 */
function getDailyReport(date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const totalUsage = db.prepare(`
    SELECT COUNT(*) as total FROM usage_logs WHERE date(used_at) = ?
  `).get(targetDate).total;

  const byMealType = db.prepare(`
    SELECT mt.id, mt.name, COUNT(ul.id) as count
    FROM meal_types mt
    LEFT JOIN usage_logs ul ON mt.id = ul.meal_type_id AND date(ul.used_at) = ?
    GROUP BY mt.id, mt.name
    ORDER BY mt.name
  `).all(targetDate);

  const logs = db.prepare(`
    SELECT ul.id, ul.used_at,
           s.id as staff_id, s.first_name, s.last_name, s.barcode,
           d.name as department_name,
           mt.name as meal_type_name,
           u.username as created_by
    FROM usage_logs ul
    JOIN staff s ON ul.staff_id = s.id
    LEFT JOIN departments d ON s.department_id = d.id
    JOIN meal_types mt ON ul.meal_type_id = mt.id
    LEFT JOIN users u ON ul.created_by_user_id = u.id
    WHERE date(ul.used_at) = ?
    ORDER BY ul.used_at DESC
  `).all(targetDate);

  return { date: targetDate, total_usage: totalUsage, by_meal_type: byMealType, logs };
}

/**
 * GET /api/reports/monthly
 */
function getMonthlyReport(year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;
  const yearMonth = `${y}-${String(m).padStart(2, '0')}`;

  const totalUsage = db.prepare(`
    SELECT COUNT(*) as total FROM usage_logs WHERE strftime('%Y-%m', used_at) = ?
  `).get(yearMonth).total;

  const byMealType = db.prepare(`
    SELECT mt.id, mt.name, COUNT(ul.id) as count
    FROM meal_types mt
    LEFT JOIN usage_logs ul ON mt.id = ul.meal_type_id AND strftime('%Y-%m', ul.used_at) = ?
    GROUP BY mt.id, mt.name
    ORDER BY mt.name
  `).all(yearMonth);

  const byDepartment = db.prepare(`
    SELECT d.id, d.name, COUNT(ul.id) as count
    FROM departments d
    LEFT JOIN staff s ON d.id = s.department_id
    LEFT JOIN usage_logs ul ON s.id = ul.staff_id AND strftime('%Y-%m', ul.used_at) = ?
    GROUP BY d.id, d.name
    ORDER BY d.name
  `).all(yearMonth);

  // Staff summary with quota info
  const staffSummary = db.prepare(`
    SELECT s.id, s.first_name, s.last_name, s.barcode,
           d.name as department_name,
           COUNT(ul.id) as total_used
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN usage_logs ul ON s.id = ul.staff_id AND strftime('%Y-%m', ul.used_at) = ?
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY s.first_name, s.last_name
  `).all(yearMonth);

  // Get default quota
  const defaultQuota = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'monthly_quota'").get()?.value || '22',
    10
  );

  // Enrich staff summary with quota info
  const enrichedStaffSummary = staffSummary.map((staff) => {
    // Sum up all meal type quotas for this staff
    const rights = db.prepare(`
      SELECT SUM(monthly_quota) as total_quota FROM staff_meal_rights WHERE staff_id = ?
    `).get(staff.id);

    const totalQuota = rights.total_quota || (defaultQuota * 3); // default: 3 meal types * monthly_quota
    return {
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        barcode: staff.barcode,
        department: staff.department_name,
      },
      total_used: staff.total_used,
      total_quota: totalQuota,
      remaining: totalQuota - staff.total_used,
    };
  });

  return {
    year: y,
    month: m,
    total_usage: totalUsage,
    by_meal_type: byMealType,
    by_department: byDepartment,
    staff_summary: enrichedStaffSummary,
  };
}

/**
 * GET /api/reports/yearly
 */
function getYearlyReport(year) {
  const y = year || new Date().getFullYear();
  const yearStr = String(y);

  const totalUsage = db.prepare(`
    SELECT COUNT(*) as total FROM usage_logs WHERE strftime('%Y', used_at) = ?
  `).get(yearStr).total;

  const byMonth = db.prepare(`
    SELECT CAST(strftime('%m', used_at) AS INTEGER) as month, COUNT(*) as total
    FROM usage_logs
    WHERE strftime('%Y', used_at) = ?
    GROUP BY strftime('%m', used_at)
    ORDER BY month
  `).all(yearStr);

  const byDepartment = db.prepare(`
    SELECT d.id, d.name, COUNT(ul.id) as count
    FROM departments d
    LEFT JOIN staff s ON d.id = s.department_id
    LEFT JOIN usage_logs ul ON s.id = ul.staff_id AND strftime('%Y', ul.used_at) = ?
    GROUP BY d.id, d.name
    ORDER BY d.name
  `).all(yearStr);

  const byMealType = db.prepare(`
    SELECT mt.id, mt.name, COUNT(ul.id) as count
    FROM meal_types mt
    LEFT JOIN usage_logs ul ON mt.id = ul.meal_type_id AND strftime('%Y', ul.used_at) = ?
    GROUP BY mt.id, mt.name
    ORDER BY mt.name
  `).all(yearStr);

  return {
    year: y,
    total_usage: totalUsage,
    by_month: byMonth,
    by_department: byDepartment,
    by_meal_type: byMealType,
  };
}

/**
 * GET /api/reports/staff/:id
 */
function getStaffReport(staffId, year, month) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;
  const yearMonth = `${y}-${String(m).padStart(2, '0')}`;

  const staff = db.prepare(`
    SELECT s.*, d.name as department_name
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = ?
  `).get(staffId);

  if (!staff) return null;

  const usageByDay = db.prepare(`
    SELECT date(used_at) as date, mt.name as meal_type_name, COUNT(*) as count
    FROM usage_logs ul
    JOIN meal_types mt ON ul.meal_type_id = mt.id
    WHERE ul.staff_id = ? AND strftime('%Y-%m', ul.used_at) = ?
    GROUP BY date(used_at), mt.id
    ORDER BY date
  `).all(staffId, yearMonth);

  const totalUsed = db.prepare(`
    SELECT COUNT(*) as total FROM usage_logs
    WHERE staff_id = ? AND strftime('%Y-%m', used_at) = ?
  `).get(staffId, yearMonth).total;

  const defaultQuota = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'monthly_quota'").get()?.value || '22',
    10
  );

  const rights = db.prepare(`
    SELECT SUM(monthly_quota) as total_quota FROM staff_meal_rights WHERE staff_id = ?
  `).get(staffId);

  const totalQuota = rights.total_quota || (defaultQuota * 3);

  return {
    staff: {
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      barcode: staff.barcode,
      department: staff.department_name,
      photo_url: staff.photo_url,
    },
    usage_by_day: usageByDay,
    monthly_summary: {
      used: totalUsed,
      quota: totalQuota,
      remaining: totalQuota - totalUsed,
    },
  };
}

/**
 * Export monthly report as Excel
 */
async function exportMonthlyExcel(year, month) {
  const report = getMonthlyReport(year, month);
  const yearMonth = `${report.year}-${String(report.month).padStart(2, '0')}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Yemekhane Takip Sistemi';
  workbook.created = new Date();

  // -- Summary Sheet --
  const summarySheet = workbook.addWorksheet('Özet');
  summarySheet.columns = [
    { header: 'Bilgi', key: 'label', width: 30 },
    { header: 'Değer', key: 'value', width: 20 },
  ];
  summarySheet.addRow({ label: 'Dönem', value: yearMonth });
  summarySheet.addRow({ label: 'Toplam Kullanım', value: report.total_usage });
  summarySheet.addRow({});
  summarySheet.addRow({ label: '--- Yemek Tiplerine Göre ---', value: '' });
  for (const mt of report.by_meal_type) {
    summarySheet.addRow({ label: mt.name, value: mt.count });
  }
  summarySheet.addRow({});
  summarySheet.addRow({ label: '--- Departmanlara Göre ---', value: '' });
  for (const dept of report.by_department) {
    summarySheet.addRow({ label: dept.name, value: dept.count });
  }

  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // -- Staff Detail Sheet --
  const staffSheet = workbook.addWorksheet('Personel Detay');
  staffSheet.columns = [
    { header: 'Barkod', key: 'barcode', width: 15 },
    { header: 'Ad', key: 'first_name', width: 15 },
    { header: 'Soyad', key: 'last_name', width: 15 },
    { header: 'Departman', key: 'department', width: 20 },
    { header: 'Kullanılan', key: 'used', width: 12 },
    { header: 'Toplam Hak', key: 'quota', width: 12 },
    { header: 'Kalan', key: 'remaining', width: 12 },
  ];

  for (const s of report.staff_summary) {
    staffSheet.addRow({
      barcode: s.staff.barcode,
      first_name: s.staff.first_name,
      last_name: s.staff.last_name,
      department: s.staff.department,
      used: s.total_used,
      quota: s.total_quota,
      remaining: s.remaining,
    });
  }

  staffSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  staffSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  return workbook;
}

/**
 * Export yearly report as Excel
 */
async function exportYearlyExcel(year) {
  const report = getYearlyReport(year);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Yemekhane Takip Sistemi';
  workbook.created = new Date();

  // -- Yearly Summary --
  const summarySheet = workbook.addWorksheet('Yıllık Özet');
  summarySheet.columns = [
    { header: 'Bilgi', key: 'label', width: 30 },
    { header: 'Değer', key: 'value', width: 20 },
  ];
  summarySheet.addRow({ label: 'Yıl', value: report.year });
  summarySheet.addRow({ label: 'Toplam Kullanım', value: report.total_usage });

  summarySheet.addRow({});
  summarySheet.addRow({ label: '--- Aylara Göre ---', value: '' });
  const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  for (const m of report.by_month) {
    summarySheet.addRow({ label: monthNames[m.month], value: m.total });
  }

  summarySheet.addRow({});
  summarySheet.addRow({ label: '--- Departmanlara Göre ---', value: '' });
  for (const dept of report.by_department) {
    summarySheet.addRow({ label: dept.name, value: dept.count });
  }

  summarySheet.addRow({});
  summarySheet.addRow({ label: '--- Yemek Tiplerine Göre ---', value: '' });
  for (const mt of report.by_meal_type) {
    summarySheet.addRow({ label: mt.name, value: mt.count });
  }

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  return workbook;
}

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getStaffReport,
  exportMonthlyExcel,
  exportYearlyExcel,
};
