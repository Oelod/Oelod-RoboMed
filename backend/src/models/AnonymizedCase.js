const mongoose = require('mongoose');

/**
 * AnonymizedCase Schema: The Institutional Research Vault
 * Stores clinical coordinates for AI training and statutory reporting, 
 * stripped of all Personally Identifiable Information (PHI).
 */
const AnonymizedCaseSchema = new mongoose.Schema({
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  description: { type: String, required: true },
  symptoms: [{ type: String }],
  diagnosis: { type: String }, // Final diagnosis from doctor
  specialty: { type: String, required: true },
  priority: { type: String },
  capturedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AnonymizedCase', AnonymizedCaseSchema);
