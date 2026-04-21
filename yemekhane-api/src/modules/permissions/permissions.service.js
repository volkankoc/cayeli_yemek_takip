const db = require('../../config/database');

function getMatrix() {
  const rows = db.prepare('SELECT role, permission FROM role_permissions ORDER BY role, permission').all();
  const matrix = {};
  for (const row of rows) {
    if (!matrix[row.role]) matrix[row.role] = [];
    matrix[row.role].push(row.permission);
  }
  return matrix;
}

function replaceRolePermissions(role, permissions, actorUserId) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role = ?').run(role);
    const insert = db.prepare('INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)');
    for (const permission of permissions) {
      insert.run(role, permission);
    }
    db.prepare(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
      VALUES (?, 'permissions.update', 'role', ?, ?)
    `).run(actorUserId || null, role, JSON.stringify({ permissions }));
  });
  tx();
  return getMatrix();
}

module.exports = { getMatrix, replaceRolePermissions };
