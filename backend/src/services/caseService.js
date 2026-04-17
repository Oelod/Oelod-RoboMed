const Case   = require('../models/Case');
const emitter = require('../events/emitter');
const aiService = require('./aiService');


// ── Create Case ───────────────────────────────────────────────────────────────
const createCase = async ({ patientId, symptoms, description, attachments }) => {
  // Call AI — graceful degradation if unavailable
  const aiResult = await aiService.triage(symptoms);

  const priority = aiResult?.priority_level?.toLowerCase() || 'medium';

  const newCase = await Case.create({
    patient:         patientId,
    symptoms,
    description,
    attachments:     attachments || [],
    aiPrediction:    aiResult || null,
    priority,
    assignedSpecialty: aiResult?.recommended_specialty || '',
    timeline: [{ event: 'case_created', actorId: patientId, note: 'Case submitted by patient' }],
  });

  emitter.emit('case.created', { caseId: newCase._id, patientId, specialty: newCase.assignedSpecialty });
  return newCase;
};

// ── Get Cases (role-scoped) ───────────────────────────────────────────────────
const getCases = async ({ userId, activeRole, specialization, status, search, page = 1, limit = 20 }) => {
  const skip   = (page - 1) * limit;
  let filter   = {};

  const User = require('../models/User');
  const user = await User.findById(userId);

  if (activeRole === 'patient') {
    filter.patient = userId;
  } else if (activeRole === 'doctor') {
    // Verified check
    if (user?.status === 'pending') {
      // Pending doctors only see cases they were ALREADY assigned to (unlikely but safe)
      // and NOT the open queue
      filter.doctor = userId;
    } else {
      filter.$or = [
        { doctor: userId },
        { status: 'open', assignedSpecialty: { $in: Array.isArray(specialization) ? specialization : [specialization] } },
      ];
    }
  }
  // admin: no filter → sees all

  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const [cases, total] = await Promise.all([
    Case.find(filter).sort('-createdAt').skip(skip).limit(limit)
      .populate('patient', 'fullName hospitalId')
      .populate('doctor',  'fullName specialization'),
    Case.countDocuments(filter),
  ]);

  return { cases, total, page, limit };
};

// ── Get single case ───────────────────────────────────────────────────────────
const getCaseById = async (caseId, userId, activeRole) => {
  const c = await Case.findById(caseId)
    .populate('patient', 'fullName hospitalId email')
    .populate('doctor',  'fullName specialization email');

  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  // Access control
  if (activeRole === 'patient' && c.patient._id.toString() !== userId.toString()) {
    const e = new Error('Forbidden: You are not allowed to access this case'); e.statusCode = 403; throw e;
  }
  
  if (activeRole === 'doctor') {
    // 1. Doctor is assigned to THIS case
    const isAssigned = c.doctor && c.doctor._id.toString() === userId.toString();
    // 2. Case is open in doctor's queue (visibility for acceptance)
    const isInQueue = c.status === 'open';
    // 3. Implied Consent: Doctor has ANY active case with this patient
    const hasActiveCaseWithPatient = await Case.findOne({ 
      patient: c.patient._id, 
      doctor: userId, 
      status: 'assigned' 
    });

    if (!isAssigned && !isInQueue && !hasActiveCaseWithPatient && c.status !== 'open') {
      const e = new Error('Forbidden: You do not have medical authorization to access this record'); e.statusCode = 403; throw e;
    }
  }

  return c;
};

// ── Get Patient History for Doctor ────────────────────────────────────────────
const getPatientHistory = async (patientId, doctorId) => {
  // Verify relationship (must have an active case or be assigned to a case for this patient)
  const relationship = await Case.findOne({ patient: patientId, doctor: doctorId });
  if (!relationship) {
    const e = new Error('Forbidden: No clinical relationship established with this patient');
    e.statusCode = 403;
    throw e;
  }

  const history = await Case.find({ 
    patient: patientId, 
    status: 'closed' 
  })
  .sort('-createdAt')
  .populate('doctor', 'fullName specialization');

  return history;
};

// ── Accept case (atomic — prevents double-accept) ─────────────────────────────
const acceptCase = async (caseId, doctorId, specialization) => {
  const User = require('../models/User');
  const doctor = await User.findById(doctorId);
  
  if (doctor?.status === 'pending') {
    const e = new Error('Clinical Access Restricted: Your professional license is currently pending verification by our administrative team.');
    e.statusCode = 403;
    throw e;
  }

  const doctorName = doctor ? doctor.fullName : 'Unknown';

  const updated = await Case.findOneAndUpdate(
    { _id: caseId, status: 'open' },  // atomic filter
    {
      $set: { doctor: doctorId, status: 'assigned', lockedAt: new Date() },
      $push: { timeline: { event: 'case_assigned', actorId: doctorId, note: `Accepted by ${doctorName}` } },
    },
    { new: true }
  );

  if (!updated) {
    const e = new Error('Case is no longer available (already assigned)'); e.statusCode = 409; throw e;
  }

  emitter.emit('case.assigned', { caseId, doctorId, patientId: updated.patient });
  return updated;
};

// ── Close / Reopen ────────────────────────────────────────────────────────────
const closeCase = async (caseId, doctorId, summary) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }
  if (c.doctor?.toString() !== doctorId.toString()) {
    const e = new Error('Only the assigned doctor can close this case'); e.statusCode = 403; throw e;
  }

  // Clinical Governance: Block closing if there is an active, unacknowledged prescription
  const Prescription = require('../models/Prescription');
  const activeUnacknowledgedRx = await Prescription.findOne({ caseId, isActive: true, acknowledgedByPatient: false });
  if (activeUnacknowledgedRx) {
    const e = new Error('Clinical Governance Lock: You cannot close this case until the patient acknowledges the active prescription.');
    e.statusCode = 400;
    throw e;
  }

  c.status = 'closed';
  c.timeline.push({ event: 'case_closed', actorId: doctorId, note: `Closed. Summary: ${summary}` });
  await c.save();

  emitter.emit('case.closed', { caseId, patientId: c.patient });
  return c;
};

const reopenCase = async (caseId, adminId) => {
  const c = await Case.findByIdAndUpdate(caseId,
    { $set: { status: 'open', doctor: null, lockedAt: null },
      $push: { timeline: { event: 'case_reopened', actorId: adminId } } },
    { new: true }
  );
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }
  return c;
};

const flagCase = async (caseId, adminId, note) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  c.status = 'flagged';
  if (!c.governanceNotes) c.governanceNotes = [];
  c.governanceNotes.push({ action: 'flagged', note, actorId: adminId });
  c.timeline.push({ event: 'case_flagged', actorId: adminId, note: `Flagged: ${note}` });
  
  await c.save();
  emitter.emit('case.flagged', { caseId, adminId, note });
  return c;
};

const escalateCase = async (caseId, adminId, office, note) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  c.status = 'escalated';
  if (!c.governanceNotes) c.governanceNotes = [];
  c.governanceNotes.push({ action: 'escalated', note, actorId: adminId, office });
  c.timeline.push({ event: 'case_escalated', actorId: adminId, note: `Escalated to ${office}: ${note}` });

  await c.save();
  emitter.emit('case.escalated', { caseId, adminId, office, note });
  return c;
};

const resolveEscalation = async (caseId, adminId, note) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  const User = require('../models/User');
  const user = await User.findById(adminId);

  // Transition to resolved status so General Admin can re-assign
  c.status = 'resolved'; 
  
  if (!c.governanceNotes) c.governanceNotes = [];
  c.governanceNotes.push({ 
    action: 'resolved', 
    note, 
    actorId: adminId, 
    office: user.assignedOffice 
  });

  c.timeline.push({ 
    event: 'escalation_resolved', 
    actorId: adminId, 
    note: `[Institutional Settlement - ${user.assignedOffice}]: ${note}` 
  });

  await c.save();
  emitter.emit('case.escalation_resolved', { 
    caseId, 
    adminId, 
    doctorId: c.doctor,
    patientId: c.patient,
    office: user.assignedOffice, 
    note 
  });
  return c;
};

const assignDoctor = async (caseId, adminId, { doctorId, specialty, note }) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  const User = require('../models/User');
  const doctor = await User.findById(doctorId);
  if (!doctor) { const e = new Error('Doctor not found'); e.statusCode = 404; throw e; }

  c.doctor = doctorId;
  c.status = 'assigned';
  if (specialty) c.assignedSpecialty = specialty;
  
  c.timeline.push({ 
    event: 'case_assigned_by_admin', 
    actorId: adminId, 
    note: `Manually assigned to Dr. ${doctor.fullName}${note ? ': ' + note : ''}` 
  });

  await c.save();
  emitter.emit('case.assigned', { caseId, doctorId, patientId: c.patient, adminId });
  return c;
};

const { uploadToCloudinary } = require('../utils/uploadFile');

const addAttachments = async (caseId, files) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  const uploadPromises = files.map(file => uploadToCloudinary(file.buffer));
  const uploadedFiles = await Promise.all(uploadPromises);

  c.attachments.push(...uploadedFiles);
  c.timeline.push({ event: 'attachments_added', note: `${files.length} new file(s) attached` });
  
  await c.save();
  return c;
};

const addLabResults = async (caseId, userId, files) => {
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }

  const uploadPromises = files.map(file => uploadToCloudinary(file.buffer));
  const uploadedFiles = await Promise.all(uploadPromises);

  const labData = uploadedFiles.map((f, i) => ({
    fileUrl:    f.fileUrl,
    publicId:   f.publicId,
    fileName:   files[i].originalname,
    uploadedBy: userId,
  }));

  c.labResults.push(...labData);
  c.timeline.push({ 
    event: 'lab_results_added', 
    actorId: userId, 
    note: `${files.length} lab result(s) uploaded` 
  });
  
  await c.save();

  // Notify Doctor and Patient
  emitter.emit('lab.results_added', { 
    caseId:   c._id, 
    patientId: c.patient, 
    doctorId:  c.doctor,
    uploaderId: userId 
  });

  return c;
};

module.exports = { createCase, getCases, getCaseById, acceptCase, closeCase, reopenCase, flagCase, escalateCase, resolveEscalation, assignDoctor, addAttachments, getPatientHistory, addLabResults };
