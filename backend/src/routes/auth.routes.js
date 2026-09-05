const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

router.post('/login', authController.login);
router.get('/me', require('../middleware/auth').authenticate, authController.me);
router.post('/change-password', require('../middleware/auth').authenticate, authController.changePassword);
router.post('/logout', require('../middleware/auth').authenticate, authController.logout);

module.exports = router;