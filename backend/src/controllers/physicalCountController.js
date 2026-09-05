const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { writeAudit } = require('../utils/audit');
const { sanitizeString } = require('../utils/sanitize');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listPhysicalCounts(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.status) where.status = req.query.status;

  const [total, data] = await Promise.all([
    prisma.physicalCount.count({ where }),
    prisma.physicalCount.findMany({
      where,
      include: { department: true, createdBy: { select: { id: true, fullName: true, username: true } } },
      orderBy: { countDate: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function getPhysicalCount(req, res) {
  const count = await prisma.physicalCount.findUnique({
    where: { id: req.params.id },
    include: { department: true, createdBy: true, items: { include: { item: true } } },
  });
  if (!count) throw new ApiError(404, 'Physical count not found.');
  res.json({ data: count });
}

async function createPhysicalCount(req, res) {
  const body = sanitizeBody(req.body, ['remarks']);
  const { departmentId, countDate, items } = body;
  if (!departmentId || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'departmentId and items are required.');
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) throw new ApiError(404, 'Department not found.');

  const count = await prisma.$transaction(async (tx) => {
    const doc = await tx.physicalCount.create({
      data: {
        departmentId,
        countDate: countDate ? new Date(countDate) : new Date(),
        remarks: body.remarks,
        createdById: req.user.id,
        items: {
          create: items.map((it) => ({
            itemId: it.itemId,
            systemQuantity: Number(it.systemQuantity) || 0,
            countedQuantity: Number(it.countedQuantity) || 0,
            variance: Number(it.countedQuantity) - Number(it.systemQuantity),
            remarks: it.remarks,
          })),
        },
      },
      include: { department: true, items: { include: { item: true } } },
    });
    return doc;
  });

  await writeAudit(req, 'CREATE', 'PhysicalCount', count.id, null, { departmentId, itemsCount: items.length });
  res.status(201).json({ data: count });
}

async function updatePhysicalCount(req, res) {
  const count = await prisma.physicalCount.findUnique({ where: { id: req.params.id } });
  if (!count) throw new ApiError(404, 'Physical count not found.');
  if (count.status !== 'DRAFT') {
    throw new ApiError(400, `Cannot update a ${count.status} physical count.`);
  }

  const body = sanitizeBody(req.body, ['remarks']);
  const { departmentId, countDate, items } = body;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.physicalCountItem.deleteMany({ where: { physicalCountId: count.id } });
    const doc = await tx.physicalCount.update({
      where: { id: count.id },
      data: {
        departmentId,
        countDate: countDate ? new Date(countDate) : count.countDate,
        remarks: body.remarks ?? count.remarks,
        items: {
          create: (items || []).map((it) => ({
            itemId: it.itemId,
            systemQuantity: Number(it.systemQuantity) || 0,
            countedQuantity: Number(it.countedQuantity) || 0,
            variance: Number(it.countedQuantity) - Number(it.systemQuantity),
            remarks: it.remarks,
          })),
        },
      },
      include: { department: true, items: { include: { item: true } } },
    });
    return doc;
  });

  await writeAudit(req, 'UPDATE', 'PhysicalCount', count.id, { status: count.status }, { status: updated.status });
  res.json({ data: updated });
}

async function submitPhysicalCount(req, res) {
  const count = await prisma.physicalCount.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!count) throw new ApiError(404, 'Physical count not found.');
  if (count.status !== 'DRAFT') {
    throw new ApiError(400, `Cannot submit a ${count.status} physical count.`);
  }

  const updated = await prisma.physicalCount.update({
    where: { id: count.id },
    data: { status: 'SUBMITTED' },
    include: { department: true, items: { include: { item: true } } },
  });

  await writeAudit(req, 'SUBMIT', 'PhysicalCount', count.id, { status: count.status }, { status: 'SUBMITTED' });
  res.json({ data: updated });
}

async function approvePhysicalCount(req, res) {
  const count = await prisma.physicalCount.findUnique({ where: { id: req.params.id }, include: { items: { include: { item: true } } } });
  if (!count) throw new ApiError(404, 'Physical count not found.');
  if (count.status !== 'SUBMITTED') {
    throw new ApiError(400, `Only submitted physical counts can be approved (current: ${count.status}).`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.physicalCount.update({ where: { id: count.id }, data: { status: 'APPROVED' } });
    for (const it of count.items) {
      if (it.variance !== 0) {
        await tx.item.update({
          where: { id: it.itemId },
          data: { currentStock: it.countedQuantity },
        });
        await tx.ledgerEntry.create({
          data: {
            itemId: it.itemId,
            referenceType: 'ADJUSTMENT_IN',
            referenceId: count.id,
            date: new Date(),
            inflow: it.variance > 0 ? it.variance : 0,
            outflow: it.variance < 0 ? Math.abs(it.variance) : 0,
            runningBalance: it.countedQuantity,
            remarks: `Physical count adjustment (variance: ${it.variance})`,
            createdById: req.user.id,
          },
        });
      }
    }
  });

  await writeAudit(req, 'APPROVE', 'PhysicalCount', count.id, { status: count.status }, { status: 'APPROVED' });
  res.json({ message: 'Physical count approved and stock adjusted.' });
}

module.exports = { listPhysicalCounts, getPhysicalCount, createPhysicalCount, updatePhysicalCount, submitPhysicalCount, approvePhysicalCount };
