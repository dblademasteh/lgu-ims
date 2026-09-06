const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/receivingController');

router.get('/suppliers', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listSuppliers);
router.post('/suppliers', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.createSupplier);
router.post('/suppliers/import', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.importSuppliers);
router.get('/suppliers/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.getSupplier);
router.patch('/suppliers/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.updateSupplier);
router.patch('/suppliers/:id/deactivate', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.deactivateSupplier);

router.get('/receivings', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listReceivings);
router.post('/receivings', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.createReceiving);
router.get('/receivings/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.getReceiving);
router.patch('/receivings/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.updateReceiving);
router.delete('/receivings/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.deleteReceiving);

module.exports = router;