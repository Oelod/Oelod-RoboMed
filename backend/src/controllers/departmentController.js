const labService = require('../services/labService');
const prescriptionService = require('../services/prescriptionService');
const res_ = require('../utils/apiResponse');

/**
 * GET /api/departments/lab/queue
 */
const getLabQueue = async (req, res) => {
  const queue = await labService.getLabQueue();
  return res_.success(res, { queue });
};

/**
 * GET /api/departments/lab/history
 */
const getLabHistory = async (req, res) => {
  const history = await labService.getLabHistory(req.user._id);
  return res_.success(res, { history });
};

/**
 * GET /api/departments/pharmacy/queue
 */
const getPharmacyQueue = async (req, res) => {
  const queue = await prescriptionService.getPharmacyQueue();
  return res_.success(res, { queue });
};

/**
 * PATCH /api/departments/pharmacy/prescriptions/:id/dispense
 */
const dispensePrescription = async (req, res) => {
  const rx = await prescriptionService.dispensePrescription(req.params.id, req.user._id);
  return res_.success(res, { prescription: rx }, 'Medications dispensed successfully');
};

/**
 * GET /api/departments/pharmacy/history
 */
const getPharmacyHistory = async (req, res) => {
  const history = await prescriptionService.getPharmacyHistory(req.user._id);
  return res_.success(res, { history });
};

/**
 * PATCH /api/departments/pharmacy/prescriptions/:id/item/:index
 */
const updatePrescriptionItem = async (req, res) => {
  const { status } = req.body;
  const rx = await prescriptionService.updatePrescriptionItem(
    req.params.id, 
    parseInt(req.params.index), 
    status, 
    req.user._id
  );
  return res_.success(res, { prescription: rx }, `Medication item marked as ${status}`);
};

module.exports = {
  getLabQueue,
  getLabHistory,
  getPharmacyQueue,
  dispensePrescription,
  getPharmacyHistory,
  updatePrescriptionItem
};
