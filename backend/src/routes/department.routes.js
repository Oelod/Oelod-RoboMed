const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const { isAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.use(isAuth);

// Lab Routes
router.get('/lab/queue',   requireRole('lab', 'admin'), ctrl.getLabQueue);
router.get('/lab/history', requireRole('lab', 'admin'), ctrl.getLabHistory);
router.get('/pharmacy/queue', requireRole('pharmacist', 'admin'), ctrl.getPharmacyQueue);
router.get('/pharmacy/history', requireRole('pharmacist', 'admin'), ctrl.getPharmacyHistory);
router.patch('/pharmacy/prescriptions/:id/dispense', requireRole('pharmacist', 'admin'), ctrl.dispensePrescription);
router.patch('/pharmacy/prescriptions/:id/item/:index', requireRole('pharmacist', 'admin', 'patient'), ctrl.updatePrescriptionItem);

module.exports = router;
