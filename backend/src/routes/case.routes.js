const express = require('express');
const router  = express.Router();
const Joi     = require('joi');
const { isAuth }   = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const ctrl         = require('../controllers/caseController');

const createCaseSchema = Joi.object({
  symptoms:    Joi.array().items(Joi.string()).min(1).required(),
  description: Joi.string().allow('').optional(),
});

const upload     = require('../middlewares/upload');

router.use(isAuth);

const closeCaseSchema = Joi.object({
  summary: Joi.string().min(5).required()
});

router.post('/',                      validate(createCaseSchema), ctrl.createCase);
router.post('/:caseId/attachments',   upload.array('files', 5), ctrl.addAttachments);
router.get('/',                       ctrl.getCases);
router.get('/:caseId',                ctrl.getCaseById);
router.patch('/:caseId/accept',       ctrl.acceptCase);
router.patch('/:caseId/close',        validate(closeCaseSchema), ctrl.closeCase);
router.patch('/:caseId/reopen',       ctrl.reopenCase);
router.patch('/:caseId/flag',         ctrl.flagCase);
router.patch('/:caseId/escalate',     ctrl.escalateCase);
router.patch('/:caseId/resolve-escalation', ctrl.resolveEscalation);
router.patch('/:caseId/assign',       ctrl.assignDoctor);
router.get('/:caseId/history',        ctrl.getCaseHistory);
router.get('/patient/:patientId/history', ctrl.getPatientClinicalHistory);

// Phase 4 - Lab Requests & Prescriptions
// Optional schemas
const requestLabSchema = Joi.object({
  testType: Joi.string().required(),
  urgency: Joi.string().valid('routine', 'urgent', 'stat').optional(),
  notes: Joi.string().allow('').optional()
});

const prescriptionSchema = Joi.object({
  drugs: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    dosage: Joi.string().required(),
    frequency: Joi.string().required(),
    duration: Joi.string().required(),
    instructions: Joi.string().allow('').optional()
  })).min(1).required(),
  notes: Joi.string().allow('').optional()
});

router.post('/:caseId/lab-requests',  validate(requestLabSchema), ctrl.requestLab);
router.post('/:caseId/lab-results',   upload.array('files', 1), ctrl.uploadLabResult);
router.get('/:caseId/labs',           ctrl.getCaseLabs);

router.post('/:caseId/prescriptions', validate(prescriptionSchema), ctrl.addPrescription);
router.get('/:caseId/prescriptions',  ctrl.getCasePrescriptions);
router.patch('/:caseId/prescriptions/:prescriptionId/acknowledge', ctrl.acknowledgePrescription);

// Phase 9.2 - AI Audio Transcription
router.post('/:caseId/voice-notes', upload.single('audio'), ctrl.addVoiceNote);

module.exports = router;
