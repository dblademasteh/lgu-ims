const prisma = require('../prisma');
const { paginate } = require('../utils/paginate');

async function listAuditLogs(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};

  if (req.query.action) where.action = req.query.action;
  if (req.query.entityType) where.entityType = req.query.entityType;
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.from || req.query.to) {
    where.createdAt = {};
    if (req.query.from) where.createdAt.gte = new Date(req.query.from);
    if (req.query.to) where.createdAt.lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, username: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  res.json({ data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

module.exports = { listAuditLogs };