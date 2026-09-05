const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = Router();

const VIEWERS = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'];

router.get('/rsmi', authorize(...VIEWERS), reportController.rsmiReport);
router.get('/inventory', authorize(...VIEWERS), reportController.inventoryReport);
router.get('/movements', authorize(...VIEWERS), reportController.movementsReport);
router.get('/ledger-card/:itemId', authorize(...VIEWERS), reportController.ledgerCardReport);

module.exports = router;