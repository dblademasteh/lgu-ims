const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/receivingController');

router.get('/suppliers', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listSuppliers);
router.post('/suppliers', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.createSupplier);

router.get('/receivings', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listReceivings);
router.post('/receivings', authorize('ADMIN', 'WAREHOUSE_STAFF'), ctrl.createReceiving);
router.get('/receivings/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.getReceiving);

module.exports = router;