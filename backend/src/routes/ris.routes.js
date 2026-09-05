const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const risController = require('../controllers/risController');

const router = Router();

const { MANAGE_ROLES } = risController;

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), risController.listRis);
router.post('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'DEPARTMENT_HEAD'), risController.createRis);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), risController.getRis);
router.patch('/:id/approve', authorize(...MANAGE_ROLES), risController.approveRis);
router.patch('/:id/reject', authorize(...MANAGE_ROLES), risController.rejectRis);
router.post('/:id/issue', authorize('ADMIN', 'WAREHOUSE_STAFF'), risController.issueRis);
router.patch('/:id/cancel', authorize('ADMIN'), risController.cancelRis);

module.exports = router;