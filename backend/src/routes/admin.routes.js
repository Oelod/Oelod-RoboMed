const express = require('express');
const router  = express.Router();
const { isAuth } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/roleGuard');
const ctrl    = require('../controllers/adminController');

const ingestionCtrl = require('../controllers/dataIngestionController');

// All admin routes require auth + admin role
router.use(isAuth, isAdmin);

router.get('/users',                     ctrl.getUsers);
router.get('/users/:userId',             ctrl.getUserById);
router.patch('/users/:userId/approve-role', ctrl.approveRole);
router.patch('/users/:userId/reject-role',  ctrl.rejectRole);
router.patch('/users/:userId/roles',     ctrl.updateRoles);
router.patch('/users/:userId/suspend',   ctrl.suspendUser);
router.patch('/users/:userId/activate',  ctrl.activateUser);
router.get('/stats',                     ctrl.getStats);
router.get('/audit-log',                 ctrl.getAuditLog);
router.get('/compliance-report/:userId', ctrl.getComplianceReport);
router.get('/download-governance-report', ctrl.downloadGovernanceReport);

// Ingestion
router.post('/ingest/patients',          ingestionCtrl.ingestPatients);
router.post('/ingest/doctors',           ingestionCtrl.ingestDoctors);

// Governance Offices
router.get('/escalated-matters',         ctrl.getEscalatedCases);
router.patch('/users/:userId/office',    ctrl.updateOffice);
router.get('/governance-health',         ctrl.getGovernanceHealth);
router.get('/export-research-vault',     ctrl.exportResearchData);

module.exports = router;
