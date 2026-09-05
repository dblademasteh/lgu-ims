const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { writeAudit } = require('../utils/audit');
const { publicUser } = require('../middleware/auth');
const config = require('../config');
const { sanitizeString } = require('../utils/sanitize');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listUsers(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};
  if (req.query.search) {
    where.OR = [
      { username: { contains: req.query.search, mode: 'insensitive' } },
      { fullName: { contains: req.query.search, mode: 'insensitive' } },
      { email: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }
  if (req.query.role) where.role = req.query.role;
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { department: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  res.json({ data: users.map(publicUser), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function createUser(req, res) {
  const body = sanitizeBody(req.body, ['username', 'email', 'fullName']);
  const { username, email, password, fullName, role, departmentId, externalId } = body;
  if (!username || !email || !password || !fullName || !role) {
    throw new ApiError(400, 'username, email, password, fullName and role are required.');
  }
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.');

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) throw new ApiError(409, 'Username or email is already in use.');

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, config.bcryptRounds),
      fullName,
      role,
      departmentId: departmentId || null,
      externalId: externalId || null,
    },
    include: { department: true },
  });

  await writeAudit(req, 'CREATE', 'User', user.id, null, { username: user.username, role: user.role });
  res.status(201).json({ data: publicUser(user) });
}

async function updateUser(req, res) {
  const { id } = req.params;
  const body = sanitizeBody(req.body, ['fullName', 'email', 'externalId']);
  const { fullName, email, role, departmentId, isActive, externalId, password } = body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'User not found.');

  if ((req.user.role !== 'ADMIN') && (role || isActive !== undefined)) {
    throw new ApiError(403, 'Only an administrator may change roles or activation status.');
  }
  if (req.user.id === id && isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }
  if (role && role !== existing.role && existing.username === 'admin' && req.user.id !== existing.id) {
    throw new ApiError(400, 'The built-in admin account role cannot be changed.');
  }

  const data = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (isActive !== undefined) data.isActive = isActive;
  if (externalId !== undefined) data.externalId = externalId || null;
  if (password) data.password = await bcrypt.hash(password, config.bcryptRounds);
  if (password) data.passwordChangedAt = new Date();

  const user = await prisma.user.update({
    where: { id },
    data,
    include: { department: true },
  });

  const after = { username: user.username, role: user.role, isActive: user.isActive, externalId: user.externalId };
  const before = { username: existing.username, role: existing.role, isActive: existing.isActive, externalId: existing.externalId };
  await writeAudit(req, 'UPDATE', 'User', user.id, before, after);
  res.json({ data: publicUser(user) });
}

async function dashboardStats(req, res) {
  const { from, to } = req.query;
  let start = null;
  let end = null;
  if (from) start = new Date(from);
  if (to) {
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
  }
  if (isNaN(start)) start = null;
  if (isNaN(end)) end = null;

  const monthStart = start || new Date(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const monthEnd = end || new Date();

  const lowStockRows = await prisma.$queryRaw`
    SELECT i."id", i."name", i."sku", i."currentStock", i."reorderThreshold", i."unit", c."id" AS "categoryId", c."name" AS "categoryName"
    FROM "Item" i
    LEFT JOIN "Category" c ON c."id" = i."categoryId"
    WHERE i."isActive" = true AND i."currentStock" <= i."reorderThreshold"
    ORDER BY i."currentStock" ASC
    LIMIT 10
  `;
  const lowStock = lowStockRows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    currentStock: r.currentStock,
    reorderThreshold: r.reorderThreshold,
    unit: r.unit,
    category: r.categoryId ? { id: r.categoryId, name: r.categoryName } : null,
    lowStock: true,
  }));
  const lowStockItems = lowStock.length;

  const whereClause = {
    referenceType: 'ISSUANCE',
    date: { gte: monthStart, lte: monthEnd },
  };

  const [totalItems, totalCategories, pendingRis, issuedThisMonth] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.ris.count({ where: { status: 'PENDING' } }),
    prisma.ledgerEntry.count({ where: whereClause }),
  ]);

  const recentLedger = await prisma.ledgerEntry.findMany({
    where: (start || end) ? { date: { gte: monthStart, lte: monthEnd } } : undefined,
    include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
    orderBy: { date: 'desc' },
    take: 8,
  });

  res.json({
    stats: {
      totalItems,
      totalCategories,
      pendingRis,
      lowStockItems,
      issuedThisMonth,
    },
    lowStock,
    recentLedger,
  });
}

module.exports = { listUsers, createUser, updateUser, dashboardStats };