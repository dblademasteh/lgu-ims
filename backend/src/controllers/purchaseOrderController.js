const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { writeAudit } = require('../utils/audit');
const { generatePoNumber } = require('../utils/poNumber');
const { sanitizeString } = require('../utils/sanitize');
const { round2 } = require('../utils/money');
const { notifyInApp } = require('../services/notificationService');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listPurchaseOrders(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.supplierId) where.supplierId = req.query.supplierId;
  if (req.query.search) where.poNumber = { contains: req.query.search, mode: 'insensitive' };
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = new Date(req.query.from);
    if (req.query.to) where.date.lte = new Date(req.query.to);
  }

  const [total, data] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: { department: true, supplier: true, createdBy: { select: { id: true, fullName: true, username: true } }, items: { include: { item: true } } },
      orderBy: { date: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function getPurchaseOrder(req, res) {
  const doc = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { department: true, supplier: true, createdBy: { select: { id: true, fullName: true, username: true } }, items: { include: { item: true } } },
  });
  if (!doc) throw new ApiError(404, 'Purchase Order not found.');
  res.json({ data: doc });
}

async function createPurchaseOrder(req, res) {
  const body = sanitizeBody(req.body, ['remarks']);
  const { departmentId, supplierId, date, items, remarks } = body;
  if (!departmentId || !supplierId || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'departmentId, supplierId and items are required.');
  }

  const poNumber = await generatePoNumber();
  let totalAmount = 0;
  for (const it of items) {
    totalAmount += (Number(it.quantity) || 0) * (round2(it.unitCost) || 0);
  }

  const doc = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        departmentId,
        supplierId,
        date: date ? new Date(date) : new Date(),
        totalAmount: round2(totalAmount),
        remarks,
        createdById: req.user.id,
        items: {
          create: items.map((it) => ({
            itemId: it.itemId,
            quantity: Number(it.quantity) || 0,
            unitCost: round2(it.unitCost) || 0,
          })),
        },
      },
      include: { department: true, supplier: true, createdBy: { select: { id: true, fullName: true, username: true } }, items: { include: { item: true } } },
    });
    return po;
  });

  await writeAudit(req, 'CREATE', 'PurchaseOrder', doc.id, null, { poNumber, totalAmount });
  res.status(201).json({ data: doc });
}

async function updatePurchaseOrder(req, res) {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Purchase Order not found.');
  if (existing.status !== 'PENDING') {
    throw new ApiError(400, `Cannot update a ${existing.status} purchase order.`);
  }
  const hasReceived = await prisma.purchaseOrderItem.findFirst({
    where: { purchaseOrderId: existing.id, receivedQuantity: { gt: 0 } },
  });
  if (hasReceived) {
    throw new ApiError(400, 'Cannot edit a purchase order that already has received stock. Cancel it instead.');
  }

  const body = sanitizeBody(req.body, ['remarks']);
  const { departmentId, supplierId, date, items, remarks } = body;
  if (!departmentId || !supplierId || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'departmentId, supplierId and items are required.');
  }

  let totalAmount = 0;
  for (const it of items) {
    totalAmount += (Number(it.quantity) || 0) * (round2(it.unitCost) || 0);
  }

  const doc = await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: existing.id } });
    const po = await tx.purchaseOrder.update({
      where: { id: existing.id },
      data: {
        departmentId,
        supplierId,
        date: date ? new Date(date) : existing.date,
        totalAmount: round2(totalAmount),
        remarks: remarks ?? existing.remarks,
        items: { create: items.map((it) => ({ itemId: it.itemId, quantity: Number(it.quantity) || 0, unitCost: round2(it.unitCost) || 0 })) },
      },
      include: { department: true, supplier: true, createdBy: { select: { id: true, fullName: true, username: true } }, items: { include: { item: true } } },
    });
    return po;
  });

  await writeAudit(req, 'UPDATE', 'PurchaseOrder', doc.id, { poNumber: existing.poNumber }, { poNumber: doc.poNumber });
  res.json({ data: doc });
}

async function approvePurchaseOrder(req, res) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!po) throw new ApiError(404, 'Purchase Order not found.');
  if (po.status !== 'PENDING') {
    throw new ApiError(400, `Only pending purchase orders can be approved (current: ${po.status}).`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'APPROVED' },
    include: { department: true, supplier: true, items: { include: { item: true } } },
  });

  await writeAudit(req, 'APPROVE', 'PurchaseOrder', po.id, { status: po.status }, { status: 'APPROVED' });
  if (po.createdById && po.createdById !== req.user.id) {
    await notifyInApp({
      userId: po.createdById,
      type: 'SYSTEM',
      title: 'Purchase order approved',
      message: `${po.poNumber} has been approved. You can now receipt stock against it.`,
    });
  }
  res.json({ data: updated });
}

async function cancelPurchaseOrder(req, res) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
  if (!po) throw new ApiError(404, 'Purchase Order not found.');
  if (!['PENDING', 'APPROVED'].includes(po.status)) {
    throw new ApiError(400, `Only pending or approved purchase orders can be cancelled (current: ${po.status}).`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'CANCELLED' },
    include: { department: true, supplier: true, items: { include: { item: true } } },
  });

  await writeAudit(req, 'CANCEL', 'PurchaseOrder', po.id, { status: po.status }, { status: 'CANCELLED' });
  res.json({ data: updated });
}

module.exports = {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
};
