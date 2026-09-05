const prisma = require('../prisma');
const crypto = require('crypto');
const config = require('../config');

function computeChainHash(payload, previousHash) {
  const data = JSON.stringify({ ...payload, previousHash });
  return crypto.createHmac('sha256', config.auditChainSecret).update(data).digest('hex');
}

async function writeAudit(req, action, entityType, entityId, before, after) {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
  try {
    const previous = await prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } });
    const previousHash = previous?.chainHash || '';
    const payload = {
      userId: req.user ? req.user.id : null,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      before: before ?? undefined,
      after: after ?? undefined,
      ip: ip ? String(ip) : null,
    };
    const chainHash = computeChainHash(payload, previousHash);

    await prisma.auditLog.create({
      data: {
        ...payload,
        ip: payload.ip,
        chainHash,
        previousHash,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
  }
}

async function verifyAuditChain() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      action: true,
      entityType: true,
      entityId: true,
      before: true,
      after: true,
      ip: true,
      chainHash: true,
      previousHash: true,
    },
  });

  let chainStartIndex = -1;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    if (!entry.chainHash) {
      chainStartIndex = -1;
      continue;
    }

    if (chainStartIndex === -1) {
      chainStartIndex = i;
    }

    const previousHash = i === chainStartIndex ? '' : logs[i - 1].chainHash || '';
    if (entry.previousHash !== previousHash) {
      return { valid: false, index: i, id: entry.id, reason: 'previousHash mismatch' };
    }

    const payload = {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before ?? undefined,
      after: entry.after ?? undefined,
      ip: entry.ip,
    };
    const expectedHash = computeChainHash(payload, previousHash);
    if (entry.chainHash !== expectedHash) {
      return { valid: false, index: i, id: entry.id, reason: 'chainHash mismatch' };
    }
  }

  return { valid: true, count: logs.length };
}

module.exports = { writeAudit, verifyAuditChain };
