const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

async function listLedger(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};

  if (req.query.itemId) where.itemId = req.query.itemId;
  if (req.query.referenceType) where.referenceType = req.query.referenceType;
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = new Date(req.query.from);
    if (req.query.to) where.date.lte = new Date(req.query.to);
  }

  const [total, rows] = await Promise.all([
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      skip: offset,
      take: limit,
    }),
  ]);

  res.json({ data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function getLedgerCard(req, res) {
  const item = await prisma.item.findUnique({
    where: { id: req.params.itemId },
    include: { category: true },
  });
  if (!item) throw new ApiError(404, 'Item not found.');

  const { from, to } = req.query;
  const where = { itemId: item.id };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [entries, totalIn, totalOut] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      include: { createdBy: { select: { id: true, fullName: true, username: true } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.ledgerEntry.aggregate({ where, _sum: { inflow: true } }),
    prisma.ledgerEntry.aggregate({ where, _sum: { outflow: true } }),
  ]);

  res.json({
    data: {
      item,
      entries,
      totals: {
        in: totalIn._sum.inflow || 0,
        out: totalOut._sum.outflow || 0,
        balance: item.currentStock,
      },
    },
  });
}

module.exports = { listLedger, getLedgerCard };