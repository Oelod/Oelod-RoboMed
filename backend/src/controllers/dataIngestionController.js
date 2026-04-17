const ingestionService = require('../services/dataIngestionService');
const apiResponse = require('../utils/apiResponse');

/**
 * POST /api/admin/ingest/patients
 * Restricted to: Admin
 */
const ingestPatients = async (req, res) => {
  const { patients } = req.body;
  if (!patients || !Array.isArray(patients)) return apiResponse.error(res, 'Patients must be an array', 400);
  if (patients.length > 500) return apiResponse.error(res, 'Limit exceeded (500)', 413);

  const results = await ingestionService.ingestLegacyPatients(patients, req.user._id);
  return apiResponse.success(res, { results });
};

const ingestDoctors = async (req, res) => {
  const { doctors } = req.body;
  if (!doctors || !Array.isArray(doctors)) return apiResponse.error(res, 'Doctors must be an array', 400);
  if (doctors.length > 500) return apiResponse.error(res, 'Limit exceeded (500)', 413);

  const results = await ingestionService.ingestLegacyDoctors(doctors, req.user._id);
  return apiResponse.success(res, { results });
};

module.exports = { ingestPatients, ingestDoctors };
