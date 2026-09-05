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

async function listBudgets(req, res) {
  const budgets = await prisma.budget.findMany({
    include: { department: true },
    orderBy: { year: 'desc' },
  });
  res.json({ data: budgets });
}

async function getBudget(req, res) {
  const budget = await prisma.budget.findUnique({
    where: { id: req.params.id },
    include: { department: true },
  });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  res.json({ data: budget });
}

async function createBudget(req, res) {
  const body = sanitizeBody(req.body, ['remarks']);
  const { departmentId, amount, year } = body;
  if (!departmentId || !amount || !year) {
    throw new ApiError(400, 'departmentId, amount and year are required.');
  }
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) throw new ApiError(404, 'Department not found.');

  const budget = await prisma.budget.create({
    data: { departmentId, amount: Number(amount), year: Number(year) },
    include: { department: true },
  });
  await writeAudit(req, 'CREATE', 'Budget', budget.id, null, { departmentId, amount, year });
  res.status(201).json({ data: budget });
}

async function updateBudget(req, res) {
  const budget = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!budget) throw new ApiError(404, 'Budget not found.');

  const body = sanitizeBody(req.body, ['remarks']);
  const { amount } = body;
  const updated = await prisma.budget.update({
    where: { id: budget.id },
    data: { amount: amount !== undefined ? Number(amount) : budget.amount },
    include: { department: true },
  });
  await writeAudit(req, 'UPDATE', 'Budget', budget.id, { amount: budget.amount }, { amount: updated.amount });
  res.json({ data: updated });
}

async function deleteBudget(req, res) {
  const budget = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  await prisma.budget.delete({ where: { id: budget.id } });
  await writeAudit(req, 'DELETE', 'Budget', budget.id, { amount: budget.amount }, null);
  res.json({ message: 'Budget deleted.' });
}

module.exports = { listBudgets, getBudget, createBudget, updateBudget, deleteBudget };
