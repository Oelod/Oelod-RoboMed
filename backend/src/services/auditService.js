const AuditLog = require('../models/AuditLog');

/**
 * Institutional Audit Service
 * Central manifold for recording forensic traces.
 */

const logAction = async ({ 
  actorId, 
  action, 
  targetId, 
  targetType = 'User', 
  metadata = {}, 
  phiAccessed = false, 
  req 
}) => {
  try {
    const logData = {
      actorId,
      action,
      targetId,
      targetType,
      metadata,
      phiAccessed,
      clientIp: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null,
      userAgent: req ? req.headers['user-agent'] : null,
    };

    await AuditLog.create(logData);
  } catch (err) {
    // Audit failures should not crash clinical operations, but must be logged to stderr
    console.error('🛡️ [Statutory Rupture] Failed to record forensic audit log:', err.message);
  }
};

const getComplianceReport = async (filters = {}, options = {}) => {
  const { startDate, endDate, phiOnly } = filters;
  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate)   query.createdAt.$lte = new Date(endDate);
  }

  if (phiOnly) query.phiAccessed = true;

  return AuditLog.find(query)
    .populate('actorId', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

module.exports = { logAction, getComplianceReport };
