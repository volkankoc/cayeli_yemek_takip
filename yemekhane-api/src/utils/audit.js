const db = require('../config/database');

function writeAuditLog({ actorUserId = null, action, entityType, entityId = null, details = null }) {
  db.prepare(`
    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    actorUserId,
    action,
    entityType,
    entityId ? String(entityId) : null,
    details ? JSON.stringify(details) : null
  );
}

module.exports = { writeAuditLog };
