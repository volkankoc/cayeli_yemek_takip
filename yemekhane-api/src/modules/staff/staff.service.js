const db = require('../../config/database');

/**
 * @param {{ department_id?: number, is_active?: number, search?: string, page?: number, limit?: number }} filters
 */
function getAll(filters = {}) {
  const { department_id, is_active, search, page = 1, limit = 20 } = filters;

  let where = 'WHERE 1=1';
  const params = [];

  if (department_id) {
    where += ' AND s.department_id = ?';
    params.push(department_id);
  }
  if (is_active !== undefined && is_active !== null && is_active !== '') {
    where += ' AND s.is_active = ?';
    params.push(Number(is_active));
  }
  if (search) {
    where += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.barcode LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const offset = (page - 1) * limit;

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM staff s ${where}
  `).get(...params).count;

  const data = db.prepare(`
    SELECT s.*, d.name as department_name
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    ${where}
    ORDER BY s.first_name, s.last_name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { data, total, page, limit };
}

function getById(id) {
  const staff = db.prepare(`
    SELECT s.*, d.name as department_name
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    WHERE s.id = ?
  `).get(id);

  if (!staff) return null;

  // Get meal rights
  const mealRights = db.prepare(`
    SELECT smr.*, mt.name as meal_type_name
    FROM staff_meal_rights smr
    JOIN meal_types mt ON smr.meal_type_id = mt.id
    WHERE smr.staff_id = ?
  `).all(id);

  // Get current month usage
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthUsage = db.prepare(`
    SELECT meal_type_id, COUNT(*) as used
    FROM usage_logs
    WHERE staff_id = ? AND strftime('%Y-%m', used_at) = ?
    GROUP BY meal_type_id
  `).all(id, yearMonth);

  return { ...staff, meal_rights: mealRights, current_month_usage: currentMonthUsage };
}

function create(data) {
  const result = db.prepare(`
    INSERT INTO staff (barcode, first_name, last_name, department_id, photo_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.barcode, data.first_name, data.last_name, data.department_id, data.photo_url || null);

  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const fields = [];
  const params = [];

  if (data.barcode !== undefined) { fields.push('barcode = ?'); params.push(data.barcode); }
  if (data.first_name !== undefined) { fields.push('first_name = ?'); params.push(data.first_name); }
  if (data.last_name !== undefined) { fields.push('last_name = ?'); params.push(data.last_name); }
  if (data.department_id !== undefined) { fields.push('department_id = ?'); params.push(data.department_id); }
  if (data.photo_url !== undefined) { fields.push('photo_url = ?'); params.push(data.photo_url); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }

  if (fields.length === 0) return getById(id);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getById(id);
}

function softDelete(id) {
  db.prepare("UPDATE staff SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
}

// --- Meal Rights ---

function getMealRights(staffId) {
  return db.prepare(`
    SELECT smr.*, mt.name as meal_type_name
    FROM staff_meal_rights smr
    JOIN meal_types mt ON smr.meal_type_id = mt.id
    WHERE smr.staff_id = ?
  `).all(staffId);
}

function updateMealRights(staffId, rights) {
  const deleteMealRights = db.prepare('DELETE FROM staff_meal_rights WHERE staff_id = ?');
  const insertRight = db.prepare(`
    INSERT INTO staff_meal_rights (staff_id, meal_type_id, monthly_quota)
    VALUES (?, ?, ?)
  `);

  const updateAll = db.transaction(() => {
    deleteMealRights.run(staffId);
    for (const right of rights) {
      insertRight.run(staffId, right.meal_type_id, right.monthly_quota);
    }
  });

  updateAll();
  return getMealRights(staffId);
}

module.exports = { getAll, getById, create, update, softDelete, getMealRights, updateMealRights };
