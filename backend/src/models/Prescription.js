const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  instructions: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'dispensed', 'external'], default: 'pending' },
  fulfilledAt: Date,
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    drugs: [medicineSchema],
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'dispensed', 'partially_dispensed', 'cancelled', 'external'],
      default: 'pending',
    },
    actionLog: [{
      action: String, // 'dispensed', 'external'
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      note: String
    }],
    acknowledgedByPatient: { type: Boolean, default: false },
    fulfilledAt: Date,
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);
module.exports = Prescription;
