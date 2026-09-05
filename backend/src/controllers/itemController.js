const QRCode = require('qrcode');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { writeAudit } = require('../utils/audit');
const { notifyLowStock } = require('../services/notificationService');
const { uploadDir } = require('../middleware/upload');
const { sanitizeString } = require('../utils/sanitize');
const path = require('path');
const fs = require('fs');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listItems(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};

  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { sku: { contains: req.query.search, mode: 'insensitive' } },
      { description: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }
  if (req.query.categoryId) where.categoryId = req.query.categoryId;
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

  let total;
  let items;
  if (req.query.lowStock === 'true') {
    where.isActive = where.isActive ?? true;
    const rows = await prisma.$queryRaw`
      SELECT i.*, c."id" AS "_categoryId", c."name" AS "_categoryName"
      FROM "Item" i
      LEFT JOIN "Category" c ON c."id" = i."categoryId"
      WHERE i."isActive" = ${where.isActive} AND i."currentStock" <= i."reorderThreshold"
      ORDER BY i."name" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [{ c }] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS c FROM "Item"
      WHERE "isActive" = ${where.isActive} AND "currentStock" <= "reorderThreshold"
    `;
    items = rows.map((r) => ({ ...r, category: r._categoryId ? { id: r._categoryId, name: r._categoryName } : null }));
    total = c;
  } else {
    [total, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);
  }

  res.json({
    data: items.map((i) => ({ ...i, lowStock: i.currentStock <= i.reorderThreshold })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

async function lookupBySku(req, res) {
  const item = await prisma.item.findFirst({
    where: { sku: req.params.sku, isActive: true },
    include: { category: true },
  });
  if (!item) throw new ApiError(404, `No item found with SKU/barcode "${req.params.sku}".`);
  res.json({ data: { ...item, lowStock: item.currentStock <= item.reorderThreshold } });
}

async function getItem(req, res) {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: { category: true, ledgerEntries: { orderBy: { date: 'desc' }, take: 50 } },
  });
  if (!item) throw new ApiError(404, 'Item not found.');
  res.json({ data: { ...item, lowStock: item.currentStock <= item.reorderThreshold } });
}

async function createItem(req, res) {
  const body = sanitizeBody(req.body, ['sku', 'name', 'description', 'unit', 'stockNumber', 'fundCluster']);
  const { sku, name, description, categoryId, unit, reorderThreshold, currentStock, unitCost, stockNumber, fundCluster } = body;
  if (!sku || !name || !categoryId || !unit) {
    throw new ApiError(400, 'sku, name, categoryId and unit are required.');
  }

  const item = await prisma.item.create({
    data: {
      sku,
      name,
      description,
      categoryId,
      unit,
      reorderThreshold: Number(reorderThreshold) || 0,
      currentStock: Number(currentStock) || 0,
      unitCost: Number(unitCost) || 0,
      stockNumber: stockNumber || null,
      fundCluster: fundCluster || null,
      isActive: true,
    },
    include: { category: true },
  });

  if (item.currentStock > 0) {
    await prisma.ledgerEntry.create({
      data: {
        itemId: item.id,
        referenceType: 'OPENING_BALANCE',
        remarks: 'Initial stock on item creation',
        inflow: item.currentStock,
        runningBalance: item.currentStock,
        createdById: req.user.id,
      },
    });
  }

  await writeAudit(req, 'CREATE', 'Item', item.id, null, {
    sku: item.sku, name: item.name, currentStock: item.currentStock,
  });

  if (item.currentStock <= item.reorderThreshold) {
    await notifyLowStock(item);
  }

  res.status(201).json({ data: { ...item, lowStock: item.currentStock <= item.reorderThreshold } });
}

async function updateItem(req, res) {
  const { id } = req.params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Item not found.');

  const fields = ['name', 'description', 'categoryId', 'unit', 'reorderThreshold', 'unitCost', 'stockNumber', 'fundCluster'];
  const body = sanitizeBody(req.body, ['name', 'description', 'unit', 'stockNumber', 'fundCluster']);
  const data = {};
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = f === 'reorderThreshold' || f === 'unitCost' ? Number(body[f]) || 0 : body[f];
  }

  const item = await prisma.item.update({ where: { id }, data, include: { category: true } });
  await writeAudit(req, 'UPDATE', 'Item', item.id, {
    name: existing.name, sku: existing.sku, reorderThreshold: existing.reorderThreshold, unitCost: existing.unitCost,
  }, {
    name: item.name, sku: item.sku, reorderThreshold: item.reorderThreshold, unitCost: item.unitCost,
  });

  if (item.currentStock <= item.reorderThreshold) {
    await notifyLowStock(item);
  }

  res.json({ data: { ...item, lowStock: item.currentStock <= item.reorderThreshold } });
}

async function archiveItem(req, res) {
  const { id } = req.params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found.');

  const archived = await prisma.item.update({ where: { id }, data: { isActive: false } });
  await writeAudit(req, 'DELETE', 'Item', item.id, { name: item.name, sku: item.sku }, { isActive: false });
  res.json({ data: archived, message: 'Item archived.' });
}

async function adjustStock(req, res) {
  const { id } = req.params;
  const { operation, quantity, reason, referenceId, referenceType } = req.body;

  if (!operation || !['IN', 'OUT'].includes(operation)) {
    throw new ApiError(400, 'operation must be "IN" or "OUT".');
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, 'quantity must be a positive number.');
  }
  if (!reason) throw new ApiError(400, 'reason is required for audit purposes.');
  if (operation === 'OUT' && !referenceId) {
    throw new ApiError(400, 'referenceId is required for stock-out adjustments. Link to a RIS, receiving, or document ID.');
  }

  let type;
  if (operation === 'IN') {
    type = referenceType === 'ADJUSTMENT_IN' ? 'ADJUSTMENT_IN' : 'RECEIPT';
  } else {
    type = referenceType === 'RETURN' ? 'RETURN' : 'ADJUSTMENT_OUT';
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found.');

  if (operation === 'OUT' && qty > item.currentStock) {
    throw new ApiError(400, `Insufficient stock. Available: ${item.currentStock} ${item.unit}.`);
  }

  const inflow = operation === 'IN' ? qty : 0;
  const outflow = operation === 'OUT' ? qty : 0;
  const newBalance = item.currentStock + (operation === 'IN' ? qty : -qty);

  const [updated] = await Promise.all([
    prisma.item.update({ where: { id }, data: { currentStock: newBalance } }),
    prisma.ledgerEntry.create({
      data: {
        itemId: item.id,
        referenceType: type,
        referenceId,
        date: new Date(),
        inflow,
        outflow,
        runningBalance: newBalance,
        remarks: reason,
        createdById: req.user.id,
      },
    }),
  ]);

  await writeAudit(req, 'ADJUST', 'Item', item.id, { currentStock: item.currentStock }, { currentStock: newBalance, operation, quantity: qty, referenceType: type });
  await notifyLowStock(updated);

  res.json({ data: { ...updated, lowStock: updated.currentStock <= updated.reorderThreshold }, message: 'Stock adjusted.' });
}

async function itemQR(req, res) {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) throw new ApiError(404, 'Item not found.');

  const dataUrl = await QRCode.toDataURL(item.sku, { margin: 1, width: 480 });
  res.json({ data: { sku: item.sku, name: item.name, dataUrl, unit: item.unit, currentStock: item.currentStock } });
}

function esc(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportItems(req, res) {
  const [items] = await Promise.all([
    prisma.item.findMany({ include: { category: true }, orderBy: { sku: 'asc' } }),
  ]);

  const header = ['sku', 'name', 'description', 'category', 'unit', 'reorderThreshold', 'currentStock', 'unitCost', 'stockNumber', 'fundCluster'];
  const rows = items.map((i) => [
    i.sku, i.name, i.description, i.category?.name || '', i.unit,
    i.reorderThreshold, i.currentStock, i.unitCost, i.stockNumber || '', i.fundCluster || '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="items-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
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

async function importItems(req, res) {
  const { csv } = req.body;
  if (!csv || typeof csv !== 'string' || !csv.trim()) {
    throw new ApiError(400, 'CSV content is required.');
  }
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new ApiError(400, 'CSV must include a header row and at least one item row.');

  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name) => header.indexOf(name);

  const iSku = idx('sku');
  const iName = idx('name');
  const iCategory = idx('category');
  const iUnit = idx('unit');
  const iDescription = idx('description');
  const iReorder = idx('reorderthreshold');
  const iQty = idx('currentstock');
  const iCost = idx('unitcost');
  const iStockNumber = idx('stocknumber');
  const iFundCluster = idx('fundcluster');

  if (iSku === -1 || iName === -1 || iCategory === -1 || iUnit === -1) {
    throw new ApiError(400, 'CSV must have columns: sku, name, category, unit (description, currentStock, unitCost, stockNumber, fundCluster optional).');
  }

  const categoryCache = new Map();
  const getCategory = async (name) => {
    if (!name) throw new Error('category is required');
    if (categoryCache.has(name)) return categoryCache.get(name);
    let cat = await prisma.category.findUnique({ where: { name } });
    if (!cat) cat = await prisma.category.create({ data: { name } });
    categoryCache.set(name, cat);
    return cat;
  };

  let created = 0;
  let updated = 0;
  const errors = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const sku = (row[iSku] || '').toUpperCase();
    const name = row[iName];
    const unit = row[iUnit];
    if (!sku || !name || !unit) {
      errors.push(`Row ${r + 1}: missing sku/name/unit — skipped.`);
      continue;
    }
    try {
      const category = await getCategory(row[iCategory]);
      const existing = await prisma.item.findUnique({ where: { sku } });
      const data = {
        name,
        description: iDescription >= 0 ? row[iDescription] || null : null,
        categoryId: category.id,
        unit,
        reorderThreshold: iReorder >= 0 ? Number(row[iReorder]) || 0 : 0,
        currentStock: iQty >= 0 ? Number(row[iQty]) || 0 : 0,
        unitCost: iCost >= 0 ? Number(row[iCost]) || 0 : 0,
        stockNumber: iStockNumber >= 0 ? row[iStockNumber] || null : null,
        fundCluster: iFundCluster >= 0 ? row[iFundCluster] || null : null,
      };
      if (existing) {
        await prisma.item.update({ where: { sku }, data: { ...data, sku } });
        updated += 1;
      } else {
        const item = await prisma.item.create({ data: { ...data, sku, isActive: true } });
        if (item.currentStock > 0) {
          await prisma.ledgerEntry.create({
            data: {
              itemId: item.id,
              referenceType: 'OPENING_BALANCE',
              remarks: 'Imported opening balance',
              inflow: item.currentStock,
              runningBalance: item.currentStock,
              createdById: req.user.id,
            },
          });
        }
        created += 1;
      }
    } catch (err) {
      errors.push(`Row ${r + 1} (${sku}): ${err.message}`);
    }
  }

  await writeAudit(req, 'IMPORT', 'Item', null, null, { rows: rows.length - 1, created, updated, errors: errors.length });
  res.json({ data: { created, updated, errors }, message: `Import complete: ${created} created, ${updated} updated, ${errors.length} errors.` });
}

async function uploadItemImage(req, res) {
  const { id } = req.params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new ApiError(404, 'Item not found.');

  if (!req.file) throw new ApiError(400, 'Image file is required.');

  if (item.imageUrl) {
    const oldPath = path.join(uploadDir, path.basename(item.imageUrl));
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (_err) { /* ignore cleanup errors */ }
    }
  }

  const publicUrl = `/uploads/items/${req.file.filename}`;
  const updated = await prisma.item.update({
    where: { id },
    data: { imageUrl: publicUrl },
    include: { category: true },
  });

  await writeAudit(req, 'UPDATE', 'Item', item.id, { imageUrl: item.imageUrl }, { imageUrl: publicUrl });

  res.json({ data: { ...updated, lowStock: updated.currentStock <= updated.reorderThreshold } });
}

module.exports = { listItems, lookupBySku, getItem, createItem, updateItem, archiveItem, adjustStock, itemQR, exportItems, importItems, uploadItemImage };