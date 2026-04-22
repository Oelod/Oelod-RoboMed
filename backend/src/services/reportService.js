const Report = require('../models/Report');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const emailService = require('./emailService');
const User = require('../models/User');

const createReport = async (userId, payload) => {
  const { caseId, targetDoctor, reason, description } = payload;
  
  // Verify case exists and patient is the reporter
  const medicalCase = await Case.findById(caseId);
  if (!medicalCase) throw new Error('Case not found');
  if (medicalCase.patient.toString() !== userId.toString()) {
    throw new Error('Institutional Protocol Error: Reporter must be the patient associated with this clinical case.');
  }

  const report = await Report.create({
    reporter: userId,
    targetDoctor,
    caseId,
    reason,
    description
  });

  await AuditLog.create({
    actorId: userId,
    action: 'report_doctor',
    targetId: targetDoctor,
    metadata: { reportId: report._id, caseId }
  });

  // Industrial Dispatch: Broadcast to Governance Board (Admins)
  try {
    const admins = await User.find({ adminLevel: { $gt: 0 } }, 'email');
    const adminEmails = admins.map(a => a.email);
    if (adminEmails.length > 0) {
      await emailService.sendMisconductFlag(adminEmails, report);
    }
  } catch (err) {
    console.error('Institutional Dispatch Failure (Governance):', err.message);
  }

  return report;
};

const getReports = async (query = {}) => {
  return await Report.find(query)
    .populate('reporter', 'fullName email')
    .populate('targetDoctor', 'fullName specialization')
    .populate('caseId', 'caseCode')
    .sort('-createdAt');
};

const updateReportStatus = async (adminId, reportId, payload) => {
  const { status, escalationTarget, adminNote, resolutionNote } = payload;
  
  const report = await Report.findById(reportId);
  if (!report) throw new Error('Report record not found');

  if (status) report.status = status;
  if (escalationTarget) report.escalationTarget = escalationTarget;
  
  if (adminNote) {
     report.adminNotes.push({ adminId, note: adminNote });
  }

  if (resolutionNote) {
     report.resolution = {
        note: resolutionNote,
        resolvedAt: new Date(),
        resolvedBy: adminId
     };
     report.status = 'resolved';
  }

  await report.save();

  await AuditLog.create({
    actorId: adminId,
    action: 'update_report',
    targetId: reportId,
    metadata: { status, escalationTarget }
  });

  return report;
};

const getVolumetricData = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.specialty) query.assignedSpecialty = filters.specialty;
  
  if (filters.start && filters.end) {
    query.createdAt = { $gte: new Date(filters.start), $lte: new Date(filters.end) };
  }

  return await Case.find(query)
    .populate('patient', 'email')
    .populate('doctor', 'fullName')
    .sort('-createdAt');
};

const getSpecialtyWorkload = async () => {
    return await Case.aggregate([
        { $group: { _id: '$assignedSpecialty', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
  getVolumetricData,
  getSpecialtyWorkload
};
