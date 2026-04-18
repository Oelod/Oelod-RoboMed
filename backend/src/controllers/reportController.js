const reportService = require('../services/reportService');
const res_ = require('../utils/apiResponse');

const submitReport = async (req, res) => {
  const report = await reportService.createReport(req.user._id, req.body);
  return res_.created(res, { report }, 'Clinical misconduct report character-perfectly logged.');
};

const getAllReports = async (req, res) => {
  // Authorization check (Admins only) - this is handled by the route guard
  const reports = await reportService.getReports(req.query);
  return res_.success(res, { reports });
};

const getMyReports = async (req, res) => {
  const reports = await reportService.getReports({ reporter: req.user._id });
  return res_.success(res, { reports });
};

const updateReport = async (req, res) => {
  const report = await reportService.updateReportStatus(req.user._id, req.params.reportId, req.body);
  return res_.success(res, { report }, 'Institutional governance record updated.');
};

module.exports = {
  submitReport,
  getAllReports,
  getMyReports,
  updateReport
};
