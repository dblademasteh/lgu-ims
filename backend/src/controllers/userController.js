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

async function isPasswordInHistory(userId, newPassword) {
  const history = await prisma.previousPassword.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: config.passwordHistoryCount,
  });
  for (const entry of history) {
    if (await bcrypt.compare(newPassword, entry.hash)) return true;
  }
  return false;
}

async function addPasswordToHistory(userId, passwordHash) {
  await prisma.previousPassword.create({ data: { userId, hash: passwordHash } });
  const count = await prisma.previousPassword.count({ where: { userId } });
  if (count > config.passwordHistoryCount) {
    const oldest = await prisma.previousPassword.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: count - config.passwordHistoryCount,
    });
    await prisma.previousPassword.deleteMany({ where: { id: { in: oldest.map((e) => e.id) } } });
  }
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
  if (password) {
    if (await isPasswordInHistory(id, password)) {
      throw new ApiError(400, `New password must not match any of the last ${config.passwordHistoryCount} passwords.`);
    }
    await addPasswordToHistory(id, existing.password);
    data.password = await bcrypt.hash(password, config.bcryptRounds);
    data.passwordChangedAt = new Date();
  }

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
  if (from) {
    const [y, m, d] = String(from).split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) start = new Date(y, m - 1, d);
  }
  if (to) {
    const [y, m, d] = String(to).split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      end = new Date(y, m - 1, d, 23, 59, 59, 999);
    }
  }
  const effectiveStart = start || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const effectiveEnd = end || new Date();

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

  const issuanceWhere = {
    referenceType: 'ISSUANCE',
    date: { gte: effectiveStart, lte: effectiveEnd },
  };

  const [
    totalItems,
    totalCategories,
    pendingRis,
    issuedThisMonth,
    accountableItems,
    itemsWithExpiry,
    itemsWithWarranty,
    pendingPhysicalCounts,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.ris.count({ where: { status: 'PENDING', createdAt: { gte: effectiveStart, lte: effectiveEnd } } }),
    prisma.ledgerEntry.count({ where: issuanceWhere }),
    prisma.item.count({ where: { isActive: true, isAccountable: true } }),
    prisma.item.count({ where: { isActive: true, expiryDate: { not: null } } }),
    prisma.item.count({ where: { isActive: true, warrantyExpiry: { not: null } } }),
    prisma.physicalCount.count({ where: { status: 'SUBMITTED' } }),
  ]);

  const recentLedger = await prisma.ledgerEntry.findMany({
    where: (start || end) ? { date: { gte: effectiveStart, lte: effectiveEnd } } : undefined,
    include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
    orderBy: { date: 'desc' },
    take: 8,
  });

  const currentYear = new Date().getFullYear();
  const budgets = await prisma.budget.findMany({
    where: { year: currentYear },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { department: { name: 'asc' } },
  });

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);

  const risTrendRaw = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*) AS count
    FROM "Ris"
    WHERE "createdAt" >= ${twelveMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month ASC
  `;

  const movementTrendRaw = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "date") AS month,
      COALESCE(SUM("inflow"), 0) AS totalInflow,
      COALESCE(SUM("outflow"), 0) AS totalOutflow
    FROM "LedgerEntry"
    WHERE "date" >= ${twelveMonthsAgo}
    GROUP BY DATE_TRUNC('month', "date")
    ORDER BY month ASC
  `;

  const monthLabels = [];
  const risTrendData = [];
  const inflowData = [];
  const outflowData = [];

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthLabels.push(label);
    const ris = risTrendRaw.find((r) => r.month && r.month.toISOString().slice(0, 7) === key);
    const mov = movementTrendRaw.find((r) => r.month && r.month.toISOString().slice(0, 7) === key);
    risTrendData.push(ris ? Number(ris.count) : 0);
    inflowData.push(mov ? Number(mov.totalInflow) : 0);
    outflowData.push(mov ? Number(mov.totalOutflow) : 0);
  }

  res.json({
    stats: {
      totalItems,
      totalCategories,
      pendingRis,
      lowStockItems,
      issuedThisMonth,
      accountableItems,
      itemsWithExpiry,
      itemsWithWarranty,
      pendingPhysicalCounts,
      budgetUtilization: budgets.map((b) => ({
        department: b.department,
        year: b.year,
        budget: b.amount,
        spent: b.spent,
        available: Math.max(0, b.amount - b.spent),
        utilizationPct: b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0,
      })),
      monthlyRis: risTrendData,
      monthlyMovements: { inflow: inflowData, outflow: outflowData },
      monthLabels,
    },
    lowStock,
    recentLedger,
  });
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  return lines.map((line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let k = 0; k < line.length; k += 1) {
      const ch = line[k];
      if (inQ) {
        if (ch === '"') {
          if (line[k + 1] === '"') { cur += '"'; k += 1; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }).map((cells) => cells.map((c) => c.trim()));
}

async function importUsers(req, res) {
  const { csv } = req.body;
  if (!csv || typeof csv !== 'string' || !csv.trim()) {
    throw new ApiError(400, 'CSV content is required.');
  }
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new ApiError(400, 'CSV must include a header row and at least one user row.');

  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name) => header.indexOf(name);

  const iUsername = idx('username');
  const iEmail = idx('email');
  const iFullName = idx('fullname');
  const iRole = idx('role');
  const iDepartment = idx('department');
  const iIsActive = idx('isactive');

  if (iUsername === -1 || iEmail === -1 || iFullName === -1) {
    throw new ApiError(400, 'CSV must have columns: username, email, fullname (role, department, isActive optional).');
  }

  let created = 0;
  let updated = 0;
  const errors = [];
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'LguIms2026!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prisma.$transaction(async (tx) => {
    const deptCache = new Map();
    const getDept = async (name) => {
      if (!name) return null;
      if (deptCache.has(name)) return deptCache.get(name);
      let dept = await tx.department.findUnique({ where: { name } });
      if (!dept) dept = await tx.department.create({ data: { name, code: name.substring(0, 3).toUpperCase() } });
      deptCache.set(name, dept);
      return dept;
    };

    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      const username = (row[iUsername] || '').toLowerCase().trim();
      const email = (row[iEmail] || '').toLowerCase().trim();
      const fullName = row[iFullName];
      if (!username || !email || !fullName) {
        errors.push(`Row ${r + 1}: missing username/email/fullname — skipped.`);
        continue;
      }
      try {
        const role = iRole >= 0 ? (row[iRole] || 'WAREHOUSE_STAFF').toUpperCase() : 'WAREHOUSE_STAFF';
        const dept = iDepartment >= 0 ? await getDept(row[iDepartment]) : null;
        const isActive = iIsActive >= 0 ? (row[iIsActive] || 'true').toLowerCase() !== 'false' : true;
        const existing = await tx.user.findFirst({ where: { OR: [{ username }, { email }] } });
        const data = {
          username,
          email,
          fullName,
          role,
          password: hashedPassword,
          isActive,
          ...(dept ? { departmentId: dept.id } : {}),
        };
        if (existing) {
          await tx.user.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await tx.user.create({ data });
          created += 1;
        }
      } catch (err) {
        errors.push(`Row ${r + 1} (${username}): ${err.message}`);
      }
    }
  });

  await writeAudit(req, 'IMPORT', 'User', null, null, { rows: rows.length - 1, created, updated, errors: errors.length });
  res.json({ data: { created, updated, errors }, message: `Import complete: ${created} created, ${updated} updated, ${errors.length} errors. Default password: ${defaultPassword}` });
}

module.exports = { listUsers, createUser, updateUser, dashboardStats, importUsers };