const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');

async function listSuppliers(req, res) {
  const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ data: suppliers });
}

async function createSupplier(req, res) {
  const { name, contact, phone, email, address } = req.body;
  if (!name) throw new ApiError(400, 'name is required.');
  const supplier = await prisma.supplier.create({ data: { name, contact, phone, email, address } });
  await writeAudit(req, 'CREATE', 'Supplier', supplier.id, null, supplier);
  res.status(201).json({ data: supplier });
}

async function listReceivings(req, res) {
  const { page = 1, limit = 20, search } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { receivingNo: { contains: search, mode: 'insensitive' } },
      { poNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
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
  const { supplierId, receivingNo, receiptDate, poNumber, drNumber, remarks, items } = req.body;
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
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost) || 0,
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

module.exports = { listSuppliers, createSupplier, listReceivings, createReceiving, getReceiving };