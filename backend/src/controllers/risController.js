const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { writeAudit } = require('../utils/audit');
const { generateRisNumber } = require('../utils/risNumber');
const { notifyLowStock } = require('../services/notificationService');
const { sendMail } = require('../services/mailer');
const { risCreated, risStatusChange } = require('../services/templates');
const config = require('../config');
const { sanitizeString } = require('../utils/sanitize');
const { round2 } = require('../utils/money');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

const RIS_INCLUDE = {
  department: true,
  requestedBy: { select: { id: true, fullName: true, username: true } },
  approvedBy: { select: { id: true, fullName: true, username: true } },
  issuedBy: { select: { id: true, fullName: true, username: true } },
  items: {
    include: { item: { include: { category: true } } },
  },
};

const MANAGE_ROLES = ['ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'];

async function listRis(req, res) {
  const { page, limit, offset } = paginate(req.query);
  const where = {};

  if (req.query.status) where.status = req.query.status;
  if (req.query.departmentId) where.departmentId = req.query.departmentId;
  if (req.query.search) where.risNumber = { contains: req.query.search, mode: 'insensitive' };
  if (req.query.from || req.query.to) {
    where.createdAt = {};
    if (req.query.from) where.createdAt.gte = new Date(req.query.from);
    if (req.query.to) where.createdAt.lte = new Date(req.query.to);
  }

  if (req.user.role === 'DEPARTMENT_HEAD') {
    where.departmentId = req.user.departmentId || '__none__';
  }

  const [total, docs] = await Promise.all([
    prisma.ris.count({ where }),
    prisma.ris.findMany({
      where,
      include: {
        department: true,
        requestedBy: { select: { id: true, fullName: true } },
        items: { select: { id: true, quantityRequested: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
  ]);

  const data = docs.map((d) => ({
    ...d,
    totalRequested: d.items.reduce((s, i) => s + i.quantityRequested, 0),
  }));

  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function getRis(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id }, include: RIS_INCLUDE });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (req.user.role === 'DEPARTMENT_HEAD' && ris.departmentId !== req.user.departmentId) {
    throw new ApiError(403, 'You can only view requisitions from your own department.');
  }

  let totalCost = 0;
  let totalRequested = 0;
  const items = ris.items.map((ri) => {
    const lineTotal = ri.quantityIssued > 0
      ? ri.quantityIssued * (ri.unitCost || ri.item.unitCost)
      : ri.quantityRequested * (ri.unitCost || ri.item.unitCost);
    totalCost += lineTotal;
    totalRequested += ri.quantityRequested;
    return {
      ...ri,
      lineCost: lineTotal,
      unitCost: ri.unitCost || ri.item.unitCost,
      availableStock: ri.item.currentStock,
    };
  });

  res.json({ data: { ...ris, items, totalRequested, totalCost } });
}

async function createRis(req, res) {
  const body = sanitizeBody(req.body, ['purpose', 'remarks']);
  const { departmentId, purpose, items, remarks } = body;

  let deptId = departmentId;
  if (req.user.role === 'DEPARTMENT_HEAD') {
    if (!req.user.departmentId) throw new ApiError(400, 'Your account is not linked to a department. Contact an administrator.');
    deptId = req.user.departmentId;
  }
  if (!deptId) throw new ApiError(400, 'departmentId is required.');
  if (!purpose) throw new ApiError(400, 'purpose is required.');
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one item is required.');
  }

  const department = await prisma.department.findUnique({ where: { id: deptId } });
  if (!department) throw new ApiError(400, 'Department not found.');

  const risNumber = await generateRisNumber();

  const ris = await prisma.$transaction(async (tx) => {
    const doc = await tx.ris.create({
      data: {
        risNumber,
        departmentId: deptId,
        purpose,
        requestedById: req.user.id,
        remarks,
        items: {
          create: items.map((it) => ({
            itemId: it.itemId,
            quantityRequested: Number(it.quantityRequested) || 0,
            unitCost: round2(it.unitCost) || 0,
            remarks: it.remarks,
          })),
        },
      },
      include: RIS_INCLUDE,
    });

    for (const it of items) {
      await tx.item.update({
        where: { id: it.itemId },
        data: { unitCost: round2(it.unitCost) || undefined },
      });
    }
    return doc;
  });

  await writeAudit(req, 'CREATE', 'Ris', ris.id, null, { risNumber, purpose });

  const notification = {
    type: 'RIS',
    title: 'New requisition pending approval',
    message: `${risNumber} — ${department.name} requested ${purpose}.`,
  };
  const approvers = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['ADMIN', 'PROPERTY_CUSTODIAN'] } },
  });
  if (approvers.length > 0) {
    await prisma.notification.createMany({
      data: approvers.map((u) => ({ ...notification, userId: u.id })),
    });
    const appUrl = (config.appUrl || '').replace(/\/$/, '');
    const url = `${appUrl}/ris`;
    const tpl = risCreated(risNumber, department.name, purpose, url);
    await sendMail({ to: approvers.map((u) => u.email).filter(Boolean).join(', '), subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {});
  }

  res.status(201).json({ data: ris });
}

async function approveRis(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id }, include: { items: true, department: true } });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['PENDING', 'REJECTED'].includes(ris.status)) {
    throw new ApiError(400, `Only pending or rejected RIS can be approved (current: ${ris.status}).`);
  }
  if (req.user.id === ris.requestedById) {
    throw new ApiError(400, 'You cannot approve your own requisition.');
  }

  const approvedItems = (req.body.items || []).length > 0 ? req.body.items : null;
  const remarks = sanitizeString(req.body.remarks);

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.ris.update({
      where: { id: ris.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date(),
        remarks: remarks ?? ris.remarks,
      },
      include: RIS_INCLUDE,
    });

    for (const line of ris.items) {
      const override = approvedItems ? approvedItems.find((i) => i.itemId === line.itemId || i.risItemId === line.id) : null;
      let qtyApproved = override ? Number(override.quantityApproved) : line.quantityRequested;
      if (qtyApproved > line.quantityRequested) {
        throw new ApiError(400, `Approved quantity cannot exceed requested (${line.quantityRequested}).`);
      }
      await tx.risItem.update({
        where: { id: line.id },
        data: {
          quantityApproved: qtyApproved,
          unitCost: round2(line.unitCost || line.item.unitCost),
        },
      });
    }

    return tx.ris.findUnique({ where: { id: ris.id }, include: RIS_INCLUDE });
  });

  await writeAudit(req, 'APPROVE', 'Ris', ris.id, { status: ris.status }, { status: 'APPROVED' });

  await prisma.notification.create({
    data: {
      userId: ris.requestedById,
      type: 'RIS',
      title: 'Requisition approved',
      message: `${ris.risNumber} has been approved.`,
    },
  });

  const appUrl = (config.appUrl || '').replace(/\/$/, '');
  const url = `${appUrl}/ris`;
  const tpl = risStatusChange(ris.risNumber, 'APPROVED', url);
  const requester = await prisma.user.findUnique({ where: { id: ris.requestedById } });
  if (requester?.email) {
    await sendMail({ to: requester.email, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {});
  }

  res.json({ data: updated });
}

async function rejectRis(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id } });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['PENDING', 'APPROVED'].includes(ris.status)) {
    throw new ApiError(400, `Only pending or approved RIS can be rejected (current: ${ris.status}).`);
  }
  const reason = sanitizeString(req.body.remarks) || 'Rejected by approving officer.';

  const updated = await prisma.ris.update({
    where: { id: ris.id },
    data: {
      status: 'REJECTED',
      approvedById: req.user.id,
      approvedAt: new Date(),
      remarks: reason,
    },
    include: RIS_INCLUDE,
  });

  await writeAudit(req, 'REJECT', 'Ris', ris.id, { status: ris.status }, { status: 'REJECTED' });
  await prisma.notification.create({
    data: {
      userId: ris.requestedById,
      type: 'RIS',
      title: 'Requisition rejected',
      message: `${ris.risNumber} was rejected. Reason: ${reason}`,
    },
  });

  const appUrl = (config.appUrl || '').replace(/\/$/, '');
  const url = `${appUrl}/ris`;
  const tpl = risStatusChange(ris.risNumber, 'REJECTED', url);
  const requester = await prisma.user.findUnique({ where: { id: ris.requestedById } });
  if (requester?.email) {
    await sendMail({ to: requester.email, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {});
  }

  res.json({ data: updated });
}

async function issueRis(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['APPROVED', 'PARTIALLY_ISSUED'].includes(ris.status)) {
    throw new ApiError(400, `Only approved or partially issued RIS can be issued (current: ${ris.status}).`);
  }

  const overrides = (req.body.items || []).length > 0 ? req.body.items : null;

  await prisma.$transaction(async (tx) => {
    const lines = await tx.risItem.findMany({ where: { risId: ris.id }, include: { item: true } });
    let anyShort = false;

    for (const line of lines) {
      const override = overrides ? overrides.find((i) => i.itemId === line.itemId || i.risItemId === line.id) : null;
      let remaining = line.quantityApproved - line.quantityIssued;
      if (remaining <= 0) continue;

      let toIssue = remaining;
      if (override && Number.isFinite(Number(override.quantityIssued))) {
        toIssue = Number(override.quantityIssued);
        if (toIssue > remaining) {
          throw new ApiError(400, `Cannot issue more than approved (requested ${line.quantityApproved}, already issued ${line.quantityIssued}, remaining ${remaining}).`);
        }
      }

      if (toIssue > line.item.currentStock) {
        anyShort = true;
        toIssue = line.item.currentStock;
      }
      if (toIssue <= 0) continue;

      const newBalance = line.item.currentStock - toIssue;
      const newIssued = line.quantityIssued + toIssue;

      await tx.item.update({ where: { id: line.itemId }, data: { currentStock: newBalance } });
      await tx.ledgerEntry.create({
        data: {
          itemId: line.itemId,
          referenceType: 'ISSUANCE',
          referenceId: ris.id,
          date: new Date(),
          outflow: toIssue,
          runningBalance: newBalance,
          remarks: `${ris.risNumber} — ${ris.purpose}`,
          createdById: req.user.id,
        },
      });
      await tx.risItem.update({
        where: { id: line.id },
        data: {
          quantityIssued: newIssued,
          unitCost: round2(line.unitCost || line.item.unitCost),
        },
      });
    }

    const stillPending = await tx.risItem.findMany({ where: { risId: ris.id } });
    const anyRemaining = stillPending.some((l) => l.quantityApproved > l.quantityIssued);
    const newStatus = anyRemaining ? 'PARTIALLY_ISSUED' : 'ISSUED';

    await tx.ris.update({
      where: { id: ris.id },
      data: { status: newStatus, issuedById: req.user.id, issuedAt: new Date() },
    });
  });

  const updated = await prisma.ris.findUnique({ where: { id: ris.id }, include: RIS_INCLUDE });
  await writeAudit(req, 'ISSUE', 'Ris', ris.id, { status: ris.status }, { status: updated.status });

  for (const line of linesWithItems(updated)) {
    await notifyLowStock(line.item);
  }

  await prisma.notification.create({
    data: {
      userId: ris.requestedById,
      type: 'RIS',
      title: 'Requisition issued',
      message: `${ris.risNumber} was issued (${updated.status.toLowerCase().replace('_', ' ')}).`,
    },
  });

  const appUrl = (config.appUrl || '').replace(/\/$/, '');
  const url = `${appUrl}/ris`;
  const tpl = risStatusChange(ris.risNumber, updated.status, url);
  const requester = await prisma.user.findUnique({ where: { id: ris.requestedById } });
  if (requester?.email) {
    await sendMail({ to: requester.email, subject: tpl.subject, text: tpl.text, html: tpl.html }).catch(() => {});
  }

  res.json({ data: updated });
}

function linesWithItems(ris) {
  return (ris.items || []).map((i) => ({ item: i.item }));
}

async function cancelRis(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id }, include: { items: { include: { item: true } } } });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['PENDING', 'APPROVED', 'ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status)) {
    throw new ApiError(400, `Only pending, approved, issued or partially issued RIS can be cancelled (current: ${ris.status}).`);
  }
  const remarks = sanitizeString(req.body.remarks) || 'Cancelled.';

  const updated = await prisma.$transaction(async (tx) => {
    if (['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status)) {
      for (const line of ris.items) {
        if (line.quantityIssued > 0) {
          const item = line.item;
          const newStock = item.currentStock + line.quantityIssued;
          await tx.item.update({ where: { id: item.id }, data: { currentStock: newStock } });
          await tx.ledgerEntry.create({
            data: {
              itemId: item.id,
              referenceType: 'RETURN',
              referenceId: ris.id,
              date: new Date(),
              inflow: line.quantityIssued,
              runningBalance: newStock,
              remarks: `${ris.risNumber} — cancelled, returned to stock`,
              createdById: req.user.id,
            },
          });
        }
      }
    }

    return tx.ris.update({
      where: { id: ris.id },
      data: { status: 'CANCELLED', remarks },
      include: RIS_INCLUDE,
    });
  });

  await writeAudit(req, 'CANCEL', 'Ris', ris.id, { status: ris.status }, { status: 'CANCELLED', restored: ['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) });
  res.json({ data: updated });
}

async function returnRisItems(req, res) {
  const ris = await prisma.ris.findUnique({ where: { id: req.params.id }, include: { items: { include: { item: true } } } });
  if (!ris) throw new ApiError(404, 'RIS not found.');
  if (!['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status)) {
    throw new ApiError(400, `Only issued RIS can receive returns (current: ${ris.status}).`);
  }

  const returns = (req.body.items || []).filter((it) => it.itemId || it.risItemId);
  if (returns.length === 0) throw new ApiError(400, 'At least one return item is required.');

  const updated = await prisma.$transaction(async (tx) => {
    const lines = await tx.risItem.findMany({ where: { risId: ris.id }, include: { item: true } });

    for (const ret of returns) {
      const line = lines.find((l) => l.itemId === ret.itemId || l.id === ret.risItemId);
      if (!line) throw new ApiError(404, `Item not found in RIS: ${ret.itemId || ret.risItemId}`);
      const qty = Number(ret.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, 'Return quantity must be positive.');
      if (qty > line.quantityIssued) throw new ApiError(400, `Cannot return more than issued (${line.quantityIssued}).`);

      const newStock = line.item.currentStock + qty;
      const newIssued = line.quantityIssued - qty;

      await tx.item.update({ where: { id: line.itemId }, data: { currentStock: newStock } });
      await tx.ledgerEntry.create({
        data: {
          itemId: line.itemId,
          referenceType: 'RETURN',
          referenceId: ris.id,
          date: new Date(),
          inflow: qty,
          runningBalance: newStock,
          remarks: `${ris.risNumber} — returned to stock`,
          createdById: req.user.id,
        },
      });
      await tx.risItem.update({ where: { id: line.id }, data: { quantityIssued: newIssued } });
    }

    const stillIssued = await tx.risItem.findMany({ where: { risId: ris.id } });
    const anyRemaining = stillIssued.some((l) => l.quantityIssued > 0);
    const newStatus = anyRemaining ? 'PARTIALLY_ISSUED' : 'ISSUED';

    return tx.ris.update({
      where: { id: ris.id },
      data: { status: newStatus },
      include: RIS_INCLUDE,
    });
  });

  await writeAudit(req, 'RETURN', 'Ris', ris.id, { status: ris.status }, { status: updated.status, returns: returns.length });

  await prisma.notification.create({
    data: {
      userId: ris.requestedBy.id,
      type: 'RIS',
      title: 'Items returned to stock',
      message: `${ris.risNumber} — returned items have been restocked.`,
    },
  });

  res.json({ data: updated });
}

module.exports = {
  listRis,
  getRis,
  createRis,
  approveRis,
  rejectRis,
  issueRis,
  cancelRis,
  returnRisItems,
  MANAGE_ROLES,
};