const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), categoryController.listCategories);
router.post('/', authorize('ADMIN', 'WAREHOUSE_STAFF'), categoryController.createCategory);
router.patch('/:id', authorize('ADMIN', 'WAREHOUSE_STAFF'), categoryController.updateCategory);
router.delete('/:id', authorize('ADMIN'), categoryController.deleteCategory);

module.exports = router;