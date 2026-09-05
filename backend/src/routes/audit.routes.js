const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const auditController = require('../controllers/auditController');

const router = Router();

router.get('/', authorize('ADMIN', 'AUDITOR'), auditController.listAuditLogs);

module.exports = router;