const Report = require('../models/Report');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');

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

module.exports = {
  createReport,
  getReports,
  updateReportStatus
};
