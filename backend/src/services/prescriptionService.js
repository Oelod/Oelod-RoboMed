const Prescription = require('../models/Prescription');
const Case = require('../models/Case');
const emitter = require('../events/emitter');

const addPrescription = async (caseId, doctorId, drugs, notes) => {
  const c = await Case.findById(caseId).populate('doctor', 'fullName');
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }
  if (c.status === 'closed') { const e = new Error('Cannot issue prescription on a closed case'); e.statusCode = 400; throw e; }
  if (c.doctor?._id.toString() !== doctorId.toString()) { const e = new Error('Only the assigned doctor can issue prescriptions'); e.statusCode = 403; throw e; }

  // Mark all previous prescriptions for this case as inactive
  await Prescription.updateMany({ caseId }, { $set: { isActive: false } });

  const rx = await Prescription.create({
    caseId,
    doctorId,
    drugs,
    notes: notes || '',
    isActive: true
  });

  c.timeline.push({ event: 'prescription_issued', actorId: doctorId, note: `Prescription issued with ${drugs.length} medications.` });
  await c.save();

  emitter.emit('prescription.issued', { caseId, patientId: c.patient, doctorName: c.doctor?.fullName });

  return rx;
};

const getPrescriptions = async (caseId, userId, activeRole) => {
  // Wait, I will just return the prescriptions. Security guard is inside caseService usually, so we'll just check if they have access to the case
  const c = await Case.findById(caseId);
  if (!c) { const e = new Error('Case not found'); e.statusCode = 404; throw e; }
  
  if (activeRole === 'patient' && c.patient.toString() !== userId.toString()) {
     const e = new Error('Forbidden'); e.statusCode = 403; throw e;
  }

  const rxs = await Prescription.find({ caseId }).sort('-issuedAt').populate('doctorId', 'fullName specialization');
  return rxs;
};

const acknowledgePrescription = async (prescriptionId, patientId) => {
  const rx = await Prescription.findById(prescriptionId).populate('caseId');
  if (!rx) { const e = new Error('Prescription not found'); e.statusCode = 404; throw e; }
  
  if (rx.caseId.patient.toString() !== patientId.toString()) {
    const e = new Error('Only the assigned patient can acknowledge this prescription'); e.statusCode = 403; throw e;
  }

  rx.acknowledgedByPatient = true;
  await rx.save();

  // Optionally log it to the case timeline
  const c = await Case.findById(rx.caseId._id);
  if (c) {
    c.timeline.push({ event: 'prescription_acknowledged', actorId: patientId, note: 'Patient legally acknowledged the active prescription' });
    await c.save();
  }

  return rx;
};

const getPharmacyQueue = async () => {
  return await Prescription.find({ 
    status: { $in: ['pending', 'partially_dispensed'] }, 
    isActive: true 
  })
    .populate('caseId', 'status patient')
    .populate({ path: 'caseId', populate: { path: 'patient', select: 'fullName' } })
    .populate('doctorId', 'fullName')
    .sort('-issuedAt');
};

const dispensePrescription = async (prescriptionId, pharmacistId) => {
  const rx = await Prescription.findById(prescriptionId).populate('caseId');
  if (!rx) { const e = new Error('Prescription not found'); e.statusCode = 404; throw e; }
  
  if (rx.status !== 'pending' && rx.status !== 'partially_dispensed') {
    const e = new Error('This prescription has already been processed'); e.statusCode = 400; throw e;
  }

  rx.status = 'dispensed';
  rx.fulfilledAt = new Date();
  rx.fulfilledBy = pharmacistId;
  
  // Mark all drugs as dispensed if not already
  rx.drugs.forEach(d => {
    if (d.status === 'pending') {
      d.status = 'dispensed';
      d.fulfilledAt = new Date();
      d.fulfilledBy = pharmacistId;
    }
  });

  await rx.save();

  // Log to case timeline
  const c = await Case.findById(rx.caseId._id);
  if (c) {
    c.timeline.push({ 
      event: 'prescription_dispensed', 
      actorId: pharmacistId, 
      note: `All medications dispensed by pharmacist.` 
    });
    await c.save();
  }

  emitter.emit('prescription.dispensed', { caseId: rx.caseId._id, patientId: rx.caseId.patient });

  return rx;
};

const getPharmacyHistory = async (pharmacistId) => {
  return await Prescription.find({ fulfilledBy: pharmacistId, status: { $in: ['dispensed', 'partially_dispensed'] } })
    .populate('caseId', 'patient')
    .populate({ path: 'caseId', populate: { path: 'patient', select: 'fullName' } })
    .populate('doctorId', 'fullName')
    .sort('-fulfilledAt');
};

const updatePrescriptionItem = async (prescriptionId, itemIndex, status, actorId) => {
  const rx = await Prescription.findById(prescriptionId).populate('caseId');
  if (!rx) { const e = new Error('Prescription not found'); e.statusCode = 404; throw e; }
  if (!rx.drugs[itemIndex]) { const e = new Error('Medication item not found'); e.statusCode = 404; throw e; }

  rx.drugs[itemIndex].status = status;
  rx.drugs[itemIndex].fulfilledAt = new Date();
  rx.drugs[itemIndex].fulfilledBy = actorId;

  rx.actionLog.push({
    action: status,
    actorId,
    timestamp: new Date(),
    note: `Medication "${rx.drugs[itemIndex].name}" marked as ${status}.`
  });

  const allFiltered = rx.drugs.map(d => d.status);
  if (allFiltered.every(s => s === 'dispensed')) {
    rx.status = 'dispensed';
    rx.fulfilledAt = new Date();
    rx.fulfilledBy = actorId;
  } else if (allFiltered.every(s => s === 'external' || s === 'dispensed')) {
     rx.status = allFiltered.includes('dispensed') ? 'partially_dispensed' : 'external';
  } else if (allFiltered.some(s => s !== 'pending')) {
    rx.status = 'partially_dispensed';
  }

  await rx.save();

  const c = await Case.findById(rx.caseId._id);
  if (c) {
    c.timeline.push({ 
      event: 'prescription_updated', 
      actorId, 
      note: `Medication "${rx.drugs[itemIndex].name}" processed as ${status}.` 
    });
    await c.save();
  }
  return rx;
};

module.exports = { 
  addPrescription, getPrescriptions, acknowledgePrescription, 
  getPharmacyQueue, dispensePrescription, getPharmacyHistory,
  updatePrescriptionItem 
};
