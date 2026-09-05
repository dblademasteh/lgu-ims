const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/2fa/setup', authenticate, authController.twoFactorSetup);
router.post('/2fa/enable', authenticate, authController.twoFactorEnable);
router.post('/2fa/disable', authenticate, authController.twoFactorDisable);
router.post('/2fa/login', authController.twoFactorLogin);

module.exports = router;