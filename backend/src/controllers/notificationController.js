const notificationService = require('../services/notificationService');
const res_ = require('../utils/apiResponse');

const getNotifications = async (req, res) => {
  const notifs = await notificationService.getNotifications(req.user._id);
  return res_.success(res, { notifications: notifs }, 'Notifications fetched successfully');
};

const getUnreadCount = async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  return res_.success(res, { unreadCount: count }, 'Unread count fetched');
};

const markAsRead = async (req, res) => {
  const notif = await notificationService.markAsRead(req.params.id, req.user._id);
  return res_.success(res, { notification: notif }, 'Notification marked as read');
};

const markAllAsRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);
  return res_.success(res, null, 'All notifications marked as read');
};

const deleteNotification = async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user._id);
  return res_.success(res, null, 'Notification deleted');
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
