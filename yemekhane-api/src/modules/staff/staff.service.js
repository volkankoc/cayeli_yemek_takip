const db = require('../../config/database');
const fs = require('fs');
const path = require('path');
const { writeAuditLog } = require('../../utils/audit');

const IMAGE_DIR = path.resolve(__dirname, '../../../../image');

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

function create(data, actorUserId) {
  const result = db.prepare(`
    INSERT INTO staff (barcode, first_name, last_name, department_id, phone, photo_url, is_institutional)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.barcode,
    data.first_name,
    data.last_name,
    data.department_id,
    data.phone || null,
    null,
    Number(data.is_institutional || 0)
  );
  const created = getById(result.lastInsertRowid);
  writeAuditLog({
    actorUserId,
    action: 'staff.create',
    entityType: 'staff',
    entityId: created.id,
    details: {
      barcode: created.barcode,
      first_name: created.first_name,
      last_name: created.last_name,
      department_id: created.department_id,
      phone: created.phone,
      is_institutional: created.is_institutional,
    },
  });
  return created;
}

function update(id, data, actorUserId) {
  const before = getById(id);
  const fields = [];
  const params = [];

  if (data.barcode !== undefined) { fields.push('barcode = ?'); params.push(data.barcode); }
  if (data.first_name !== undefined) { fields.push('first_name = ?'); params.push(data.first_name); }
  if (data.last_name !== undefined) { fields.push('last_name = ?'); params.push(data.last_name); }
  if (data.department_id !== undefined) { fields.push('department_id = ?'); params.push(data.department_id); }
  if (data.phone !== undefined) { fields.push('phone = ?'); params.push(data.phone || null); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); params.push(data.is_active); }
  if (data.is_institutional !== undefined) { fields.push('is_institutional = ?'); params.push(data.is_institutional); }

  if (fields.length === 0) return getById(id);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  const updated = getById(id);
  writeAuditLog({
    actorUserId,
    action: 'staff.update',
    entityType: 'staff',
    entityId: id,
    details: { before, after: updated },
  });
  return updated;
}

function softDelete(id, actorUserId) {
  const before = getById(id);
  db.prepare("UPDATE staff SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  writeAuditLog({
    actorUserId,
    action: 'staff.deactivate',
    entityType: 'staff',
    entityId: id,
    details: before
      ? { first_name: before.first_name, last_name: before.last_name, barcode: before.barcode }
      : null,
  });
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

function updateMealRights(staffId, rights, actorUserId) {
  const staff = getById(staffId);
  const before = getMealRights(staffId);
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
  const after = getMealRights(staffId);
  writeAuditLog({
    actorUserId,
    action: 'staff.meal_rights.update',
    entityType: 'staff_meal_rights',
    entityId: staffId,
    details: {
      staff: staff ? { first_name: staff.first_name, last_name: staff.last_name, barcode: staff.barcode } : null,
      before,
      after,
    },
  });
  return after;
}

function resetMealRights(staffId, actorUserId) {
  const defaultQuota = Number(db.prepare("SELECT value FROM settings WHERE key = 'monthly_quota'").get()?.value || 22);
  const mealTypes = db.prepare('SELECT id FROM meal_types WHERE is_active = 1').all();
  const rights = mealTypes.map((mt) => ({ meal_type_id: mt.id, monthly_quota: defaultQuota }));
  return updateMealRights(staffId, rights, actorUserId);
}

function bulkImport(staffRows, actorUserId) {
  const insertStmt = db.prepare(`
    INSERT INTO staff (barcode, first_name, last_name, department_id, phone, photo_url, is_institutional)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = { created: 0, skipped: 0, errors: [] };
  const tx = db.transaction(() => {
    for (const row of staffRows) {
      try {
        const exists = db.prepare('SELECT id FROM staff WHERE barcode = ?').get(row.barcode);
        if (exists) {
          result.skipped += 1;
          continue;
        }
        const inserted = insertStmt.run(
          row.barcode,
          row.first_name,
          row.last_name,
          row.department_id,
          row.phone || null,
          null,
          Number(row.is_institutional || 0)
        );
        result.created += 1;
        writeAuditLog({
          actorUserId,
          action: 'staff.create.bulk',
          entityType: 'staff',
          entityId: inserted.lastInsertRowid,
          details: row,
        });
      } catch (err) {
        result.errors.push({ barcode: row.barcode, message: err.message });
      }
    }
  });
  tx();
  return result;
}

function savePhoto(staffId, file, actorUserId) {
  const staff = getById(staffId);
  if (!staff) throw Object.assign(new Error('Personel bulunamadı'), { statusCode: 404 });
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
  const baseName = String(staff.barcode);
  const allFiles = fs.readdirSync(IMAGE_DIR);
  for (const f of allFiles) {
    if (f.startsWith(`${baseName}.`)) {
      fs.unlinkSync(path.join(IMAGE_DIR, f));
    }
  }
  const fileName = `${baseName}${ext}`;
  const absoluteFilePath = path.join(IMAGE_DIR, fileName);
  fs.writeFileSync(absoluteFilePath, file.buffer);
  const photoUrl = `/images/${fileName}`;
  db.prepare("UPDATE staff SET photo_url = ?, updated_at = datetime('now') WHERE id = ?").run(photoUrl, staffId);
  writeAuditLog({
    actorUserId,
    action: 'staff.photo.upload',
    entityType: 'staff',
    entityId: staffId,
    details: { fileName },
  });
  return getById(staffId);
}

function topUpBalance(staffId, amount, note, actorUserId) {
  const staff = getById(staffId);
  if (!staff) throw Object.assign(new Error('Personel bulunamadı'), { statusCode: 404 });
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw Object.assign(new Error('Yüklenecek tutar geçersiz'), { statusCode: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE staff SET balance = COALESCE(balance,0) + ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(numeric, staffId);
    db.prepare(`
      INSERT INTO credit_transactions (staff_id, amount, note, created_by_user_id)
      VALUES (?, ?, ?, ?)
    `).run(staffId, numeric, note || null, actorUserId || null);
  });
  tx();

  const updated = getById(staffId);
  writeAuditLog({
    actorUserId,
    action: 'staff.balance.topup',
    entityType: 'staff',
    entityId: staffId,
    details: {
      amount: numeric,
      note: note || null,
      balance_after: updated.balance,
      first_name: updated.first_name,
      last_name: updated.last_name,
      barcode: updated.barcode,
    },
  });
  return updated;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete,
  getMealRights,
  updateMealRights,
  resetMealRights,
  bulkImport,
  savePhoto,
  topUpBalance,
};
