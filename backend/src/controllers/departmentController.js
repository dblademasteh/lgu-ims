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

async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  res.json({ data: departments });
}

async function createDepartment(req, res) {
  const body = sanitizeBody(req.body, ['name', 'code', 'headName']);
  const { name, code, headName } = body;
  if (!name || !code) throw new ApiError(400, 'Department name and code are required.');
  const department = await prisma.department.create({ data: { name, code, headName } });
  await writeAudit(req, 'CREATE', 'Department', department.id, null, { name, code });
  res.status(201).json({ data: department });
}

async function updateDepartment(req, res) {
  const { id } = req.params;
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Department not found.');
  const body = sanitizeBody(req.body, ['name', 'code', 'headName']);
  const { name, code, headName } = body;
  const department = await prisma.department.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      code: code ?? existing.code,
      headName: headName !== undefined ? headName : existing.headName,
    },
  });
  await writeAudit(req, 'UPDATE', 'Department', id, { name: existing.name }, { name: department.name });
  res.json({ data: department });
}

async function deleteDepartment(req, res) {
  const { id } = req.params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true, ris: true } } },
  });
  if (!department) throw new ApiError(404, 'Department not found.');
  if (department._count.users > 0 || department._count.ris > 0) {
    throw new ApiError(400, 'Cannot delete a department that has users or RIS records.');
  }
  await prisma.department.delete({ where: { id } });
  await writeAudit(req, 'DELETE', 'Department', id, { name: department.name }, null);
  res.json({ message: 'Department deleted.' });
}

module.exports = { listDepartments, createDepartment, updateDepartment, deleteDepartment };