const prisma = require('../prisma');
const { paginate } = require('../utils/paginate');
const { renderPdf, renderExcel, addTableStyle, pdfHeader } = require('../services/reportRenderer');

function buildAuditWhere(req) {
  const where = {};
  if (req.query.action) where.action = req.query.action;
  if (req.query.entityType) where.entityType = req.query.entityType;
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.from || req.query.to) {
    where.createdAt = {};
    if (req.query.from) where.createdAt.gte = new Date(req.query.from);
    if (req.query.to) where.createdAt.lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  return where;
}

async function listAuditLogs(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = buildAuditWhere(req);

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

async function exportAuditLogs(req, res) {
  const where = buildAuditWhere(req);
  const format = (req.query.format || 'pdf').toLowerCase();

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { username: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const rows = logs.map((l) => {
    const d = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
    return {
      date: d.toISOString().slice(0, 10),
      time: d.toISOString().slice(11, 16),
      user: l.user ? `${l.user.fullName} (@${l.user.username})` : 'System',
      action: l.action,
      entity: l.entityType,
      entityId: l.entityId || '',
      ip: l.ip || '',
    };
  });

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet('Audit Log');
    addTableStyle(ws, [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'User', key: 'user', width: 30 },
      { header: 'Action', key: 'action', width: 18 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Entity ID', key: 'entityId', width: 38 },
      { header: 'IP', key: 'ip', width: 18 },
    ], rows);
    return renderExcel(res, wb, `Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const body = rows.map((r) => [r.date, r.time, r.user, r.action, r.entity, r.entityId, r.ip]);

  renderPdf(res, {
    ...pdfHeader('AUDIT TRAIL', `Exported ${new Date().toLocaleString()}`),
    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [{ text: 'Date', style: 'th' }, { text: 'Time', style: 'th' }, { text: 'User', style: 'th' }, { text: 'Action', style: 'th' }, { text: 'Entity', style: 'th' }, { text: 'Entity ID', style: 'th' }, { text: 'IP', style: 'th' }],
            ...body,
          ],
        },
        layout: { fillColor: (rowIndex) => (rowIndex % 2 === 0 ? null : '#F3F4F6') },
      },
    ],
  }, `Audit_Log_${new Date().toISOString().slice(0, 10)}.pdf`);
}

module.exports = { listAuditLogs, exportAuditLogs };
