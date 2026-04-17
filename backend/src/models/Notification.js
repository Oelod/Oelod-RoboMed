const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'CASE_CREATED', 
      'NEW_CASE_AVAILABLE', 
      'CASE_ASSIGNED', 
      'CASE_CLOSED', 
      'PRESCRIPTION_ISSUED', 
      'PRESCRIPTION_ACKNOWLEDGED',
      'LAB_REQUESTED', 
      'LAB_RESULT_UPLOADED',
      'NEW_MESSAGE',
      'SYSTEM'
    ], 
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // caseId or conversationId
  isRead: { type: Boolean, default: false },
  priority: { type: String, enum: ['standard', 'high', 'critical'], default: 'standard' },
  isPinned: { type: Boolean, default: false } // Sticks in the dashboard until dismissed
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
