const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/purchaseOrderController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), ctrl.listPurchaseOrders);
router.post('/', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.createPurchaseOrder);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), ctrl.getPurchaseOrder);
router.patch('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.updatePurchaseOrder);
router.patch('/:id/approve', authorize('ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'), ctrl.approvePurchaseOrder);
router.patch('/:id/cancel', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.cancelPurchaseOrder);

module.exports = router;
