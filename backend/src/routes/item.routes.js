const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const itemController = require('../controllers/itemController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), itemController.listItems);
router.get('/export', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), itemController.exportItems);
router.post('/import', authorize('ADMIN', 'WAREHOUSE_STAFF'), itemController.importItems);
router.get('/lookup/:sku', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), itemController.lookupBySku);
router.get('/:id/qr', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR'), itemController.itemQR);
router.get('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), itemController.getItem);
router.post('/', authorize('ADMIN', 'WAREHOUSE_STAFF'), itemController.createItem);
router.patch('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), itemController.updateItem);
router.delete('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), itemController.archiveItem);
router.post('/:id/adjust', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'), itemController.adjustStock);

module.exports = router;