const prisma = require('../prisma');

async function writeAudit(req, action, entityType, entityId, before, after) {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user ? req.user.id : null,
        action,
        entityType,
        entityId: entityId != null ? String(entityId) : null,
        before: before ?? undefined,
        after: after ?? undefined,
        ip: ip ? String(ip) : null,
      },
    });
  } catch (err) {
    // Audit must never break a request.
    console.error('[audit] failed to write audit log:', err.message);
  }
}

module.exports = { writeAudit };