const { Router } = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const itemRoutes = require('./item.routes');
const categoryRoutes = require('./category.routes');
const departmentRoutes = require('./department.routes');
const risRoutes = require('./ris.routes');
const ledgerRoutes = require('./ledger.routes');
const reportRoutes = require('./report.routes');
const notificationRoutes = require('./notification.routes');
const auditRoutes = require('./audit.routes');
const receivingRoutes = require('./receiving.routes');

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
router.use('/audit-logs', auditRoutes);
router.use('/inventory', receivingRoutes);

router.get('/roles', (req, res) => {
  res.json({ data: Object.values(ROLES).map((role) => ({ code: role, label: role.replace(/_/g, ' ').toLowerCase() })) });
});

module.exports = router;