const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { isAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');

router.use(isAuth);

// Patient Route: Submit report
router.post('/', requireRole('patient'), ctrl.submitReport);

// Admin Routes: Manage reports
router.get('/', requireRole('admin'), ctrl.getAllReports);
router.get('/my', requireRole('patient'), ctrl.getMyReports);
router.patch('/:reportId', requireRole('admin'), ctrl.updateReport);

// Institutional Aggregate Exports
router.get('/export/volumetric', requireRole('admin'), ctrl.exportVolumetricData);
router.get('/export/workload', requireRole('admin'), ctrl.exportSpecialtyWorkload);

module.exports = router;
