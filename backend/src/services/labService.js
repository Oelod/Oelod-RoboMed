const LabRequest = require('../models/LabRequest');
const LabResult = require('../models/LabResult');
const Case = require('../models/Case');
const { uploadToCloudinary } = require('../utils/uploadFile');
const emitter = require('../events/emitter');

const requestLab = async (caseId, doctorId, payload) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }
  if (c.status === 'closed') { const e = new Error('Cannot request labs on a closed case'); e.statusCode = 400; throw e; }
  if (c.doctor?.toString() !== doctorId.toString()) { const e = new Error('Only the assigned doctor can request labs'); e.statusCode = 403; throw e; }

  const req = await LabRequest.create({
    caseId,
    doctorId,
    testType: payload.testType,
    urgency: payload.urgency || 'routine',
    notes: payload.notes || ''
  });

  c.timeline.push({ event: 'lab_requested', actorId: doctorId, note: `Lab Requested: ${req.testType} (${req.urgency})` });
  await c.save();

  emitter.emit('lab.requested', { caseId, patientId: c.patient, testType: payload.testType });

  return req;
};

const uploadLabResult = async (caseId, file, uploaderId, comment) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  // Auto-link: find the most recent pending lab request for this case
  const pendingReq = await LabRequest.findOne({ caseId, status: 'pending' }).sort('-createdAt');
  
  const uploadRes = await uploadToCloudinary(file.buffer, `robomed/lab-results/${caseId}`);

  const result = await LabResult.create({
    caseId, 
    requestId: pendingReq ? pendingReq._id : null,
    fileUrl: uploadRes.fileUrl,
    publicId: uploadRes.publicId,
    mimeType: file.mimetype,
    sizeKb: Math.round(file.size / 1024),
    comment: comment || '',
    uploadedBy: uploaderId
  });

  if (pendingReq) {
    pendingReq.status = 'completed';
    await pendingReq.save();
  }

  c.timeline.push({ event: 'lab_result_added', actorId: uploaderId, note: `Lab result uploaded. Automatically linked to pending request: ${pendingReq ? 'Yes' : 'No'}` });
  await c.save();

  emitter.emit('lab.result_uploaded', { caseId, doctorId: c.doctor });

  return result;
};

const getLabArchitecture = async (caseId) => {
  const [requests, results] = await Promise.all([
    LabRequest.find({ caseId }).sort('-createdAt'),
    LabResult.find({ caseId }).sort('-createdAt').populate('uploadedBy', 'fullName')
  ]);
  return { requests, results };
};

const getLabQueue = async () => {
  return await LabRequest.find({ status: 'pending' })
    .populate('caseId', 'status patient')
    .populate({ path: 'caseId', populate: { path: 'patient', select: 'fullName' } })
    .populate('doctorId', 'fullName')
    .sort('createdAt');
};

const getLabHistory = async (userId) => {
  return await LabResult.find({ uploadedBy: userId })
    .populate('caseId', 'patient')
    .populate({ path: 'caseId', populate: { path: 'patient', select: 'fullName' } })
    .sort('-createdAt');
};

module.exports = { requestLab, uploadLabResult, getLabArchitecture, getLabQueue, getLabHistory };
