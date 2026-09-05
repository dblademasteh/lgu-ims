const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = Router();

router.get('/stats/dashboard', userController.dashboardStats);

router.get('/', authenticate, authorize('ADMIN', 'AUDITOR', 'PROPERTY_CUSTODIAN'), userController.listUsers);
router.post('/', authenticate, authorize('ADMIN'), userController.createUser);
router.patch('/:id', authenticate, authorize('ADMIN'), userController.updateUser);

module.exports = router;