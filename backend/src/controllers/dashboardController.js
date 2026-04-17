const authService = require('../services/authService');
const res_        = require('../utils/apiResponse');

// GET /api/dashboard/summary
const getSummary = async (req, res) => {
  const { activeRole, _id } = req.user;

  let stats = {};

  if (activeRole === 'doctor') {
    const Case = require('../models/Case');
    const [assigned, open, closed] = await Promise.all([
      Case.countDocuments({ doctor: _id, status: { $in: ['assigned', 'in-progress'] } }),
      Case.countDocuments({ status: 'open', assignedSpecialty: { $in: Array.isArray(req.user.specialization) ? req.user.specialization : [req.user.specialization] } }),
      Case.countDocuments({ doctor: _id, status: 'closed' }),
    ]);
    stats = { assignedCases: assigned, openCases: open, closedCases: closed };

  } else if (activeRole === 'patient') {
    const Case = require('../models/Case');
    const [total, open, closed] = await Promise.all([
      Case.countDocuments({ patient: _id }),
      Case.countDocuments({ patient: _id, status: 'open' }),
      Case.countDocuments({ patient: _id, status: 'closed' }),
    ]);
    stats = { totalCases: total, openCases: open, closedCases: closed };

  } else if (activeRole === 'admin') {
    const User = require('../models/User');
    const Case = require('../models/Case');
    const [totalUsers, totalCases, openCases] = await Promise.all([
      User.countDocuments(),
      Case.countDocuments(),
      Case.countDocuments({ status: 'open' }),
    ]);
    stats = { totalUsers, totalCases, openCases };
  }

  // Notification model built in Phase 5 — graceful fallback until then
  let unreadNotifications = 0;
  try {
    const Notification = require('../models/Notification');
    unreadNotifications = await Notification.countDocuments({ recipientId: _id, isRead: false });
  } catch { /* model not yet registered */ }

  return res_.success(res, {
    user: req.user,
    stats: { ...stats, unreadNotifications },
    quickActions: getQuickActions(activeRole),
  }, 'Dashboard summary fetched successfully');
};

const getQuickActions = (role) => ({
  patient: ['Create a new case', 'View your cases', 'Check notifications'],
  doctor:  ['View assigned cases', 'Respond to patient chats', 'Review lab updates'],
  admin:   ['Manage users', 'View system stats', 'Review audit log'],
}[role] || []);

// PATCH /api/dashboard/switch-role
const switchRole = async (req, res) => {
  const { role } = req.body;
  const user = await authService.switchRole(req.user._id, role);
  return res_.success(res, { activeRole: user.activeRole }, 'Active role switched successfully');
};

// GET /api/dashboard/widgets
const getWidgets = (req, res) => {
  const { activeRole } = req.user;
  const widgetMap = {
    patient: ['my_cases', 'notifications', 'prescriptions'],
    doctor:  ['case_queue', 'assigned_cases', 'lab_requests'],
    admin:   ['user_stats', 'system_health', 'audit_log'],
  };
  return res_.success(res, { widgets: widgetMap[activeRole] || [] }, 'Widgets fetched');
};

module.exports = { getSummary, switchRole, getWidgets };
