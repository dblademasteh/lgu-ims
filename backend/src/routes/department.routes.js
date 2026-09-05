const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const departmentController = require('../controllers/departmentController');

const router = Router();

router.get('/', authorize('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'), departmentController.listDepartments);
router.post('/', authorize('ADMIN'), departmentController.createDepartment);
router.patch('/:id', authorize('ADMIN'), departmentController.updateDepartment);
router.delete('/:id', authorize('ADMIN'), departmentController.deleteDepartment);

module.exports = router;