const Notification = require('../models/Notification');

const getNotifications = async (userId) => {
  return await Notification.find({ recipientId: userId }).sort('-createdAt').limit(50);
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ recipientId: userId, isRead: false });
};

const markAsRead = async (notificationId, userId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!notif) {
    const e = new Error('Notification not found or access denied');
    e.statusCode = 404; 
    throw e;
  }
  return notif;
};

const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

const deleteNotification = async (notificationId, userId) => {
  await Notification.findOneAndDelete({ _id: notificationId, recipientId: userId });
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
