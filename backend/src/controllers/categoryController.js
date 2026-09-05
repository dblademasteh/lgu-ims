const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../utils/audit');
const { sanitizeString } = require('../utils/sanitize');

function sanitizeBody(body, fields = []) {
  const out = { ...body };
  for (const f of fields) {
    if (out[f] !== undefined) out[f] = sanitizeString(out[f]);
  }
  return out;
}

async function listCategories(req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { items: true } } },
  });
  res.json({ data: categories });
}

async function createCategory(req, res) {
  const body = sanitizeBody(req.body, ['name', 'description']);
  const { name, description } = body;
  if (!name) throw new ApiError(400, 'Category name is required.');
  const category = await prisma.category.create({ data: { name, description } });
  await writeAudit(req, 'CREATE', 'Category', category.id, null, { name });
  res.status(201).json({ data: category });
}

async function updateCategory(req, res) {
  const { id } = req.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Category not found.');
  const body = sanitizeBody(req.body, ['name', 'description']);
  const { name, description } = body;
  const category = await prisma.category.update({
    where: { id },
    data: { name: name ?? existing.name, description: description ?? existing.description },
  });
  await writeAudit(req, 'UPDATE', 'Category', id, { name: existing.name }, { name: category.name });
  res.json({ data: category });
}

async function deleteCategory(req, res) {
  const { id } = req.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!category) throw new ApiError(404, 'Category not found.');
  if (category._count.items > 0) {
    throw new ApiError(400, 'Cannot delete a category that still has items. Archive or move the items first.');
  }
  await prisma.category.delete({ where: { id } });
  await writeAudit(req, 'DELETE', 'Category', id, { name: category.name }, null);
  res.json({ message: 'Category deleted.' });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };