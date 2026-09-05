const { Router } = require('express');
const notifyController = require('../controllers/notificationController');

const router = Router();

router.get('/', notifyController.listNotifications);
router.get('/unread-count', notifyController.unreadCount);
router.patch('/read-all', notifyController.markAllRead);
router.patch('/:id/read', notifyController.markRead);

module.exports = router;