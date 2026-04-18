const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetDoctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  caseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Case', 
    required: true 
  },
  reason: { 
    type: String, 
    required: true,
    enum: [
      'Clinical Negligence',
      'Unprofessional Conduct',
      'Ethics Violation',
      'Communication Failure',
      'Privacy Breach',
      'Other'
    ]
  },
  description: { 
    type: String, 
    required: true,
    minlength: 20
  },
  status: { 
    type: String, 
    enum: ['pending', 'under_review', 'escalated', 'resolved', 'dismissed'],
    default: 'pending'
  },
  escalationTarget: {
    type: String,
    enum: [null, 'Chief Medical Office (CMO)', 'Disciplinary Committee', 'Legal Dept'],
    default: null
  },
  adminNotes: [{
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],
  resolution: {
    note: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

// Institutional Indexing for High-Fidelity Governance
reportSchema.index({ targetDoctor: 1, status: 1 });
reportSchema.index({ reporter: 1 });

module.exports = mongoose.model('Report', reportSchema);
