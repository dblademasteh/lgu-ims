const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = Router();

const VIEWERS = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'];

router.get('/rsmi', authorize(...VIEWERS), reportController.rsmiReport);
router.get('/inventory', authorize(...VIEWERS), reportController.inventoryReport);
router.get('/movements', authorize(...VIEWERS), reportController.movementsReport);
router.get('/ledger-card/:itemId', authorize(...VIEWERS), reportController.ledgerCardReport);
router.get('/par/:risId', authorize(...VIEWERS), reportController.parReport);
router.get('/aging', authorize(...VIEWERS), reportController.agingReport);
router.get('/icing', authorize(...VIEWERS), reportController.icsReport);
router.get('/app', authorize(...VIEWERS), reportController.appReport);
router.get('/variance', authorize(...VIEWERS), reportController.varianceReport);
router.get('/acknowledgment/:risId', authorize(...VIEWERS), reportController.acknowledgmentSlipReport);
router.get('/suppliers', authorize(...VIEWERS), reportController.supplierPerformanceReport);

module.exports = router;
