const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationPreferenceController');

const router = Router();

router.use(authenticate);
router.get('/', ctrl.getPreferences);
router.patch('/', ctrl.updatePreferences);

module.exports = router;
