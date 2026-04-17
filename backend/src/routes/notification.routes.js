const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { isAuth } = require('../middlewares/auth');

router.use(isAuth);
router.get('/', ctrl.getNotifications);
router.get('/unread-count', ctrl.getUnreadCount);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
