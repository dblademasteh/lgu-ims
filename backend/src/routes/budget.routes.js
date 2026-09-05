const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const ctrl = require('../controllers/budgetController');

const router = Router();

router.get('/', authorize('ADMIN', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.listBudgets);
router.get('/:id', authorize('ADMIN', 'PROPERTY_CUSTODIAN', 'AUDITOR'), ctrl.getBudget);
router.post('/', authorize('ADMIN'), ctrl.createBudget);
router.patch('/:id', authorize('ADMIN'), ctrl.updateBudget);
router.delete('/:id', authorize('ADMIN'), ctrl.deleteBudget);

module.exports = router;
