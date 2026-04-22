const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ingestionController');
const { isAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleGuard');
const upload = require('../middlewares/upload'); // Uses memory storage

router.use(isAuth, requireRole('admin'));

/**
 * @route   POST /api/ingestion/patients
 * @desc    Bulk ingest patients from CSV
 */
router.post('/patients', upload.single('file'), ctrl.ingestPatients);

/**
 * @route   POST /api/ingestion/cases
 * @desc    Bulk ingest historical clinical cases from CSV
 */
router.post('/cases', upload.single('file'), ctrl.ingestCases);

module.exports = router;
