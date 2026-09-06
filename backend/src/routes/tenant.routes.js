const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../prisma');
const ApiError = require('../utils/ApiError');

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, code: true, isActive: true, createdAt: true, updatedAt: true },
  });
  res.json({ data: tenants });
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) throw new ApiError(400, 'Name and code are required.');

  const tenant = await prisma.tenant.create({
    data: { name, code },
  });
  res.status(201).json({ data: tenant });
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, code, isActive } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id },
    data: { name, code, isActive },
  });
  res.json({ data: tenant });
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  if (id === 'default' || id === req.user.tenantId) {
    throw new ApiError(400, 'Cannot delete the active tenant.');
  }
  await prisma.tenant.delete({ where: { id } });
  res.json({ message: 'Tenant deleted.' });
});

module.exports = router;
