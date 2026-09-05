const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const apiKeyController = require('../controllers/apiKeyController');

const router = Router();

router.use(authenticate);
router.get('/', apiKeyController.listApiKeys);
router.post('/', apiKeyController.createApiKey);
router.delete('/:id', apiKeyController.revokeApiKey);

module.exports = router;
