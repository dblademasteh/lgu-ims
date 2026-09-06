const { Router } = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const { getStats: getEmailStats } = require('../services/queue');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const itemRoutes = require('./item.routes');
const categoryRoutes = require('./category.routes');
const departmentRoutes = require('./department.routes');
const risRoutes = require('./ris.routes');
const ledgerRoutes = require('./ledger.routes');
const reportRoutes = require('./report.routes');
const notificationRoutes = require('./notification.routes');
const notificationPreferenceRoutes = require('./notificationPreference.routes');
const auditRoutes = require('./audit.routes');
const coaRoutes = require('./coa.routes');
const receivingRoutes = require('./receiving.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');
const budgetRoutes = require('./budget.routes');
const physicalCountRoutes = require('./physicalCount.routes');
const apiKeyRoutes = require('./apiKey.routes');

const router = Router();

router.use('/auth', authRoutes);

// Everything below requires authentication
router.use(authenticate);
router.use('/users', userRoutes);
router.use('/items', itemRoutes);
router.use('/categories', categoryRoutes);
router.use('/departments', departmentRoutes);
router.use('/ris', risRoutes);
router.use('/ledger', ledgerRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationPreferenceRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/coa', coaRoutes);
router.use('/inventory', receivingRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/budgets', budgetRoutes);
router.use('/physical-counts', physicalCountRoutes);
router.use('/api-keys', apiKeyRoutes);

router.get('/roles', (req, res) => {
  res.json({ data: Object.values(ROLES).map((role) => ({ code: role, label: role.replace(/_/g, ' ').toLowerCase() })) });
});

router.get('/queue/stats', authorize('ADMIN'), async (req, res) => {
  const stats = await getEmailStats();
  res.json({ data: stats });
});

module.exports = router;
