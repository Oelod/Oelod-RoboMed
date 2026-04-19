const mongoose = require('mongoose');

/**
 * AuditLog — immutable record of every sensitive admin action.
 * Documents are never updated or deleted; only created.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action:    { type: String, required: true, trim: true },
    targetId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetType:{ type: String, default: 'User' },
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
    phiAccessed: { type: Boolean, default: false },
    clientIp:    { type: String },
    userAgent:   { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
