const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabRequest', default: null }, // Auto-linked to latest pending lab request
    fileUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeKb: { type: Number, required: true },
    comment: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const LabResult = mongoose.model('LabResult', labResultSchema);
module.exports = LabResult;
