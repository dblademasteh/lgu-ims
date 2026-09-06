const { Router } = require('express');
const { authorize } = require('../middleware/auth');
const coaController = require('../controllers/coaController');

const router = Router();

router.get('/compliance', authorize('ADMIN', 'AUDITOR'), coaController.coaCompliance);

module.exports = router;
