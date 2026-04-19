const caseService = require('../services/caseService');
const res_        = require('../utils/apiResponse');

// POST /api/cases
const createCase = async (req, res) => {
  if (req.user.activeRole !== 'patient') return res_.forbidden(res, 'Only patients can create cases');
  const { symptoms, description } = req.body;
  const newCase = await caseService.createCase({
    patientId:   req.user._id,
    symptoms,
    description,
    attachments: [],
  });
  return res_.created(res, { case: newCase }, 'Case created successfully');
};

// GET /api/cases
const getCases = async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await caseService.getCases({
    userId:         req.user._id,
    activeRole:     req.user.activeRole,
    specialization: req.user.specialization,
    status,
    search,
    page:  +page  || 1,
    limit: +limit || 20,
  });
  res.setHeader('X-Total-Count', result.total);
  return res_.success(res, result, 'Cases fetched successfully');
};

const AuditLog = require('../models/AuditLog');

// GET /api/cases/:caseId
const getCaseById = async (req, res) => {
  const c = await caseService.getCaseById(req.params.caseId, req.user._id, req.user.activeRole);
  
  // Log PHI Access for Audit Compliance (HIPAA/GDPR)
  await AuditLog.create({
    actorId: req.user._id,
    action: 'PHI_ACCESS',
    targetId: c._id,
    metadata: {
      userId: req.user._id,
      patientId: c.patient,
      accessRole: req.user.activeRole
    }
  });

  return res_.success(res, { case: c });
};

// PATCH /api/cases/:caseId/accept
const acceptCase = async (req, res) => {
  if (req.user.activeRole !== 'doctor') return res_.forbidden(res, 'Only doctors can accept cases');
  const c = await caseService.acceptCase(req.params.caseId, req.user._id, req.user.specialization);
  return res_.success(res, { case: c }, 'Case accepted successfully');
};

// PATCH /api/cases/:caseId/close
const closeCase = async (req, res) => {
  if (req.user.activeRole !== 'doctor') return res_.forbidden(res, 'Only doctors can close cases');
  const c = await caseService.closeCase(req.params.caseId, req.user._id, req.body.summary);
  return res_.success(res, { case: c }, 'Case closed successfully');
};

// PATCH /api/cases/:caseId/reopen
const reopenCase = async (req, res) => {
  if (req.user.activeRole !== 'admin') return res_.forbidden(res, 'Only admins can reopen cases');
  const c = await caseService.reopenCase(req.params.caseId, req.user._id);
  return res_.success(res, { case: c }, 'Case reopened successfully');
};

const flagCase = async (req, res) => {
  if (req.user.activeRole !== 'admin' && req.user.activeRole !== 'doctor') {
    return res_.forbidden(res, 'Only admins or doctors can flag cases for review');
  }
  const { reason } = req.body;
  if (!reason) return res_.error(res, 'Flagging reason is required', 400);
  
  const c = await caseService.flagCase(req.params.caseId, req.user._id, reason);
  return res_.success(res, { case: c }, 'Case successfully flagged for review');
};

const escalateCase = async (req, res) => {
  if (req.user.activeRole !== 'admin') return res_.forbidden(res, 'Only admins can escalate cases');
  const { office, reason } = req.body;
  if (!office || !reason) return res_.error(res, 'Target office and escalation reason are required', 400);

  const c = await caseService.escalateCase(req.params.caseId, req.user._id, office, reason);
  return res_.success(res, { case: c }, `Case escalated to ${office}`);
};

const resolveEscalation = async (req, res) => {
  if (req.user.activeRole !== 'admin') return res_.forbidden(res, 'Only admins can resolve escalations');
  const { reason } = req.body;
  if (!reason) return res_.error(res, 'Resolution note is required', 400);

  const c = await caseService.resolveEscalation(req.params.caseId, req.user._id, reason);
  return res_.success(res, { case: c }, 'Escalation resolved and clinician notified');
};

const assignDoctor = async (req, res) => {
  if (req.user.activeRole !== 'admin') return res_.forbidden(res, 'Only admins can manually assign doctors');
  const { doctorId, specialty, note } = req.body;
  if (!doctorId) return res_.error(res, 'Doctor ID is required', 400);

  const c = await caseService.assignDoctor(req.params.caseId, req.user._id, { doctorId, specialty, note });
  return res_.success(res, { case: c }, 'Doctor assigned successfully');
};

// GET /api/cases/:caseId/history
const getCaseHistory = async (req, res) => {
  const c = await caseService.getCaseById(req.params.caseId, req.user._id, req.user.activeRole);
  return res_.success(res, { timeline: c.timeline }, 'Case history fetched');
};

const addAttachments = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res_.error(res, 'No files uploaded', 400);
  }
  const c = await caseService.addAttachments(req.params.caseId, req.files);
  return res_.success(res, { case: c }, 'Files uploaded successfully');
};

const labService = require('../services/labService');
const prescriptionService = require('../services/prescriptionService');

// POST /api/cases/:caseId/lab-requests
const requestLab = async (req, res) => {
  if (req.user.activeRole !== 'doctor') return res_.forbidden(res, 'Only doctors can request labs');
  const lr = await labService.requestLab(req.params.caseId, req.user._id, req.body);
  return res_.created(res, { labRequest: lr }, 'Lab requested successfully');
};

// POST /api/cases/:caseId/lab-results
const uploadLabResult = async (req, res) => {
  if (req.user.activeRole !== 'patient' && req.user.activeRole !== 'lab') return res_.forbidden(res, 'Only patients or lab techs can upload results');
  if (!req.files || req.files.length === 0) {
    return res_.error(res, 'No lab file uploaded', 400);
  }
  // take first file
  const lr = await labService.uploadLabResult(req.params.caseId, req.files[0], req.user._id, req.body.comment);
  return res_.created(res, { labResult: lr }, 'Lab result uploaded successfully');
};

// GET /api/cases/:caseId/labs
const getCaseLabs = async (req, res) => {
  // Validate basic access against caseService
  await caseService.getCaseById(req.params.caseId, req.user._id, req.user.activeRole);
  const data = await labService.getLabArchitecture(req.params.caseId);
  return res_.success(res, data, 'Case labs fetched successfully');
};

// POST /api/cases/:caseId/prescriptions
const addPrescription = async (req, res) => {
  if (req.user.activeRole !== 'doctor') return res_.forbidden(res, 'Only doctors can issue prescriptions');
  const rx = await prescriptionService.addPrescription(req.params.caseId, req.user._id, req.body.drugs, req.body.notes);
  return res_.created(res, { prescription: rx }, 'Prescription issued successfully');
};

// GET /api/cases/:caseId/prescriptions
const getCasePrescriptions = async (req, res) => {
  const rxs = await prescriptionService.getPrescriptions(req.params.caseId, req.user._id, req.user.activeRole);
  return res_.success(res, { prescriptions: rxs }, 'Prescriptions fetched successfully');
};

// PATCH /api/cases/:caseId/prescriptions/:prescriptionId/acknowledge
const acknowledgePrescription = async (req, res) => {
  if (req.user.activeRole !== 'patient') return res_.forbidden(res, 'Only patients can legally acknowledge prescriptions');
  const rx = await prescriptionService.acknowledgePrescription(req.params.prescriptionId, req.user._id);
  return res_.success(res, { prescription: rx }, 'Prescription formally acknowledged');
};

const getPatientClinicalHistory = async (req, res) => {
  if (req.user.activeRole !== 'doctor' && req.user.activeRole !== 'admin') {
    return res_.forbidden(res, 'Access restricted to clinical staff');
  }
  const history = await caseService.getPatientHistory(req.params.patientId, req.user._id);
  return res_.success(res, { history }, 'Patient medical history retrieved');
};

const addVoiceNote = async (req, res) => {
  try {
    if (!req.file) {
      console.warn('[Telemed] Dictation Handshake Rupture: No audio datastream received.');
      return res_.error(res, 'No clinical audio datastream received', 400);
    }

    console.log(`[Telemed] Processing Voice Note for case ${req.params.caseId}...`);
    const result = await caseService.processVoiceNote(req.params.caseId, req.user._id, req.file.buffer);
    
    return res_.success(res, result, 'Institutional Transcript character-perfectly generated.');
  } catch (err) {
    console.error('[Telemed] Critical Dictation Handshake Failure:', err);
    return res_.error(res, `Institutional Handshake Failure: ${err.message}`, 500);
  }
};

module.exports = { createCase, getCases, getCaseById, acceptCase, closeCase, reopenCase, flagCase, escalateCase, resolveEscalation, assignDoctor, getCaseHistory, addAttachments, requestLab, uploadLabResult, getCaseLabs, addPrescription, getCasePrescriptions, acknowledgePrescription, getPatientClinicalHistory, addVoiceNote };
