const AuditLog = require("../models/AuditLog");

// Fire-and-forget audit writer. Never throws into the request path — an audit
// failure must not break the business action, so errors are only logged.
async function recordAudit({ entity, entityId, action, actor, meta }) {
  try {
    await AuditLog.create({ entity, entityId, action, actor, meta });
  } catch (err) {
    console.error("auditLog error:", err.message);
  }
}

module.exports = { recordAudit };
