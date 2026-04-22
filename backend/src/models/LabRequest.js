const mongoose = require('mongoose');

const labRequestSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testType: { type: String, required: true },
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine',
    },
    notes: { 
      type: String, 
      default: '',
      set: v => require('../utils/crypto').encrypt(v),
      get: v => require('../utils/crypto').decrypt(v)
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

const LabRequest = mongoose.model('LabRequest', labRequestSchema);
module.exports = LabRequest;
