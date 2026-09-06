const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/physicalCountController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listPhysicalCounts);
router.post('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'), ctrl.createPhysicalCount);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.getPhysicalCount);
router.patch('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'), ctrl.updatePhysicalCount);
router.post('/:id/submit', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'), ctrl.submitPhysicalCount);
router.post('/:id/approve', authorize('ADMIN', 'PROPERTY_CUSTODIAN'), ctrl.approvePhysicalCount);
router.post('/:id/reject', authorize('ADMIN', 'PROPERTY_CUSTODIAN'), ctrl.rejectPhysicalCount);

module.exports = router;
