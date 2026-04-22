const ingestionService = require('../services/ingestionService');
const res_ = require('../utils/apiResponse');

const ingestPatients = async (req, res) => {
  if (!req.file) return res_.error(res, 'No CSV file provided', 400);

  const { defaultPassword } = req.body;
  const stats = await ingestionService.processPatientCSV(req.file.buffer, defaultPassword);
  return res_.success(res, { stats }, 'Patient ingestion initiated');
};

const ingestCases = async (req, res) => {
  if (!req.file) return res_.error(res, 'No CSV file provided', 400);

  const stats = await ingestionService.processCaseCSV(req.file.buffer);
  return res_.success(res, { stats }, 'Case ingestion initiated');
};

module.exports = {
  ingestPatients,
  ingestCases
};
