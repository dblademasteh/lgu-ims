const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const notifyController = require('../controllers/notificationController');

const router = Router();

router.use(authenticate);
router.get('/', notifyController.listNotifications);
router.get('/unread-count', notifyController.unreadCount);
router.patch('/read-all', notifyController.markAllRead);
router.patch('/:id/read', notifyController.markRead);
router.delete('/:id', notifyController.deleteNotification);
router.post('/cleanup', notifyController.cleanupOldNotifications);

module.exports = router;