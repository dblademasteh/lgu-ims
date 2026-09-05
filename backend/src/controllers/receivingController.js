const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { sanitizeString } = require('../utils/sanitize');
const { round2 } = require('../utils/money');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listSuppliers(req, res) {
  const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ data: suppliers });
}

async function createSupplier(req, res) {
  const body = sanitizeBody(req.body, ['name', 'contact', 'phone', 'email', 'address']);
  const { name, contact, phone, email, address } = body;
  if (!name) throw new ApiError(400, 'name is required.');
  const supplier = await prisma.supplier.create({ data: { name, contact, phone, email, address } });
  await writeAudit(req, 'CREATE', 'Supplier', supplier.id, null, supplier);
  res.status(201).json({ data: supplier });
}

async function listReceivings(req, res) {
  const { page = 1, limit = 20, search, from, to, supplierId } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { receivingNo: { contains: search, mode: 'insensitive' } },
      { poNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (supplierId) where.supplierId = supplierId;
  if (from || to) {
    where.receiptDate = {};
    if (from) where.receiptDate.gte = new Date(from);
    if (to) where.receiptDate.lte = new Date(to);
  }
  const [items, total] = await Promise.all([
    prisma.receiving.findMany({
      where,
      include: { supplier: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.receiving.count({ where }),
  ]);
  res.json({ data: items, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
}

async function createReceiving(req, res) {
  const body = sanitizeBody(req.body, ['receivingNo', 'poNumber', 'drNumber', 'remarks']);
  const { supplierId, receivingNo, receiptDate, poNumber, drNumber, remarks, items } = body;
  if (!supplierId || !receivingNo || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'supplierId, receivingNo and items are required.');
  }
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new ApiError(404, 'Supplier not found.');

  const receiving = await prisma.$transaction(async (tx) => {
  const doc = await tx.receiving.create({
    data: {
      supplierId,
      receivingNo,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      poNumber,
      drNumber,
      remarks,
      createdById: req.user.id,
      items: {
        create: items.map((i) => ({
          itemId: i.itemId,
          quantity: round2(i.quantity),
          unitCost: round2(i.unitCost) || 0,
          remarks: i.remarks,
        })),
      },
    },
    include: { supplier: true, items: { include: { item: true } } },
  });

  for (const ri of doc.items) {
    const item = await tx.item.findUnique({ where: { id: ri.itemId } });
    if (!item) continue;
    const newBalance = item.currentStock + ri.quantity;
    await tx.item.update({ where: { id: item.id }, data: { currentStock: newBalance, unitCost: ri.unitCost ? Number(ri.unitCost) : item.unitCost } });
    await tx.ledgerEntry.create({
      data: {
        itemId: item.id,
        referenceType: 'RECEIPT',
        referenceId: doc.id,
        date: doc.receiptDate,
        inflow: ri.quantity,
        runningBalance: newBalance,
        remarks: `Receiving ${doc.receivingNo}` + (poNumber ? ` PO ${poNumber}` : ''),
        createdById: req.user.id,
      },
    });
  }

  return doc;
});

  await writeAudit(req, 'CREATE', 'Receiving', receiving.id, null, { receivingNo, supplierId, itemsCount: items.length });
  res.json({ data: receiving, message: 'Receiving recorded and stock updated.' });
}

async function getReceiving(req, res) {
  const rec = await prisma.receiving.findUnique({ where: { id: req.params.id }, include: { supplier: true, items: { include: { item: true } }, createdBy: true } });
  if (!rec) throw new ApiError(404, 'Receiving not found.');
  res.json({ data: rec });
}

async function updateReceiving(req, res) {
  const existing = await prisma.receiving.findUnique({ where: { id: req.params.id }, include: { items: { include: { item: true } } } });
  if (!existing) throw new ApiError(404, 'Receiving not found.');

  const { supplierId, receivingNo, receiptDate, poNumber, drNumber, remarks, items } = req.body;
  if (!supplierId || !receivingNo || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'supplierId, receivingNo and items are required.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.deleteMany({ where: { referenceType: 'RECEIPT', referenceId: existing.id } });
    for (const ri of existing.items) {
      const item = await tx.item.findUnique({ where: { id: ri.itemId } });
      if (!item) continue;
      const reversed = item.currentStock - ri.quantity;
      await tx.item.update({ where: { id: item.id }, data: { currentStock: reversed } });
    }

    const doc = await tx.receiving.update({
      where: { id: existing.id },
      data: {
        supplierId,
        receivingNo,
        receiptDate: receiptDate ? new Date(receiptDate) : existing.receiptDate,
        poNumber: poNumber ?? existing.poNumber,
        drNumber: drNumber ?? existing.drNumber,
        remarks: remarks ?? existing.remarks,
        items: { deleteMany: {}, create: items.map((i) => ({ itemId: i.itemId, quantity: round2(i.quantity), unitCost: round2(i.unitCost) || 0, remarks: i.remarks })) },
      },
      include: { supplier: true, items: { include: { item: true } } },
    });

    for (const ri of doc.items) {
      const item = await tx.item.findUnique({ where: { id: ri.itemId } });
      if (!item) continue;
      const newBalance = item.currentStock + ri.quantity;
      await tx.item.update({ where: { id: item.id }, data: { currentStock: newBalance, unitCost: ri.unitCost ? Number(ri.unitCost) : item.unitCost } });
      await tx.ledgerEntry.create({
        data: {
          itemId: item.id,
          referenceType: 'RECEIPT',
          referenceId: doc.id,
          date: doc.receiptDate,
          inflow: ri.quantity,
          runningBalance: newBalance,
          remarks: `Receiving ${doc.receivingNo}` + (poNumber ? ` PO ${poNumber}` : ''),
          createdById: req.user.id,
        },
      });
    }

    return doc;
  });

  await writeAudit(req, 'UPDATE', 'Receiving', existing.id, { receivingNo: existing.receivingNo }, { receivingNo: updated.receivingNo });
  res.json({ data: updated, message: 'Receiving updated and stock adjusted.' });
}

async function deleteReceiving(req, res) {
  const existing = await prisma.receiving.findUnique({ where: { id: req.params.id }, include: { items: { include: { item: true } } } });
  if (!existing) throw new ApiError(404, 'Receiving not found.');

  await prisma.$transaction(async (tx) => {
    for (const ri of existing.items) {
      const item = await tx.item.findUnique({ where: { id: ri.itemId } });
      if (!item) continue;
      const reversed = item.currentStock - ri.quantity;
      await tx.item.update({ where: { id: item.id }, data: { currentStock: reversed } });
      await tx.ledgerEntry.create({
        data: {
          itemId: item.id,
          referenceType: 'ADJUSTMENT_OUT',
          referenceId: existing.id,
          date: new Date(),
          outflow: ri.quantity,
          runningBalance: reversed,
          remarks: `Receiving ${existing.receivingNo} deleted — reversed`,
          createdById: req.user.id,
        },
      });
    }
    await tx.receiving.delete({ where: { id: existing.id } });
  });

  await writeAudit(req, 'DELETE', 'Receiving', existing.id, { receivingNo: existing.receivingNo }, null);
  res.json({ message: 'Receiving deleted and stock reversed.' });
}

async function getSupplier(req, res) {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) throw new ApiError(404, 'Supplier not found.');
  res.json({ data: supplier });
}

async function updateSupplier(req, res) {
  const body = sanitizeBody(req.body, ['name', 'contact', 'phone', 'email', 'address']);
  const { name, contact, phone, email, address } = body;
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { name, contact, phone, email, address },
  });
  await writeAudit(req, 'UPDATE', 'Supplier', supplier.id, { name: supplier.name }, { name });
  res.json({ data: supplier });
}

async function deactivateSupplier(req, res) {
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
  await writeAudit(req, 'DELETE', 'Supplier', supplier.id, { name: supplier.name, isActive: true }, { isActive: false });
  res.json({ data: supplier, message: 'Supplier deactivated.' });
}

module.exports = { listSuppliers, createSupplier, listReceivings, createReceiving, getReceiving, updateReceiving, deleteReceiving, getSupplier, updateSupplier, deactivateSupplier };