const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const ledgerController = require('../controllers/ledgerController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ledgerController.listLedger);
router.get('/items/:itemId/card', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ledgerController.getLedgerCard);

module.exports = router;