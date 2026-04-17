const mongoose = require('mongoose');
const { generateCaseCode } = require('../utils/idGen');

const timelineEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const aiPredictionSchema = new mongoose.Schema({
  possible_conditions: [String],
  confidence_score: { type: Number, min: 0, max: 1 },
  priority_level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  recommended_specialty: String,
  modelVersion: String,
}, { _id: false });

const caseSchema = new mongoose.Schema(
  {
    caseCode: { type: String, unique: true },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    symptoms: { type: [String], required: [true, 'At least one symptom is required'] },
    description: { type: String, default: '' },

    attachments: [{
      fileUrl: String,
      publicId: String,
      uploadedAt: { type: Date, default: Date.now },
    }],

    labResults: [{
      fileUrl: String,
      fileName: String,
      publicId: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now },
    }],

    aiPrediction: { type: aiPredictionSchema, default: null },

    // Priority stored as lowercase for consistency with DB; AI returns uppercase
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    assignedSpecialty: { type: String, default: '' },

    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'closed', 'flagged', 'escalated', 'resolved'],
      default: 'open',
      index: true,
    },

    governanceNotes: [{
      action:  String,
      note:    String,
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      office:  String,
      timestamp: { type: Date, default: Date.now },
    }],

    // lockedAt prevents double-accept race condition (checked atomically)
    lockedAt: { type: Date, default: null },

    timeline: [timelineEventSchema],
  },
  { timestamps: true }
);

// ── Auto-generate caseCode before first save ──────────────────────────────────
caseSchema.pre('save', async function (next) {
  if (!this.caseCode) {
    this.caseCode = await generateCaseCode();
  }
  next();
});

// ── Full-text search index ────────────────────────────────────────────────────
caseSchema.index({ symptoms: 'text', description: 'text' });
caseSchema.index({ patient: 1, status: 1 });
caseSchema.index({ assignedSpecialty: 1, status: 1 });

const Case = mongoose.model('Case', caseSchema);
module.exports = Case;
