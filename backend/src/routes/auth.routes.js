const Joi = require('joi');
const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');

const { isAuth }    = require('../middlewares/auth');
const { validate }  = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');
const ctrl          = require('../controllers/authController');

router.use(cookieParser());

// ── Validation Schemas ────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  fullName:       Joi.string().min(2).max(100).required(),
  email:          Joi.string().email().required(),
  password:       Joi.string().min(8).required(),
  phoneNumber:    Joi.string().optional(),
  role:           Joi.string().valid('patient', 'doctor').default('patient'),
  // Role-specific fields
  age:            Joi.number().min(0).max(150).optional(),
  gender:         Joi.string().valid('male', 'female', 'other').optional(),
  specialization: Joi.string().optional().allow(''),
  licenseNumber:  Joi.string().optional().allow(''),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const roleRequestSchema = Joi.object({
  role: Joi.string().valid('doctor', 'lab', 'pharmacist').required(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

const upload      = require('../middlewares/upload');

// POST /api/auth/register
router.post('/register', upload.single('profilePicture'), validate(registerSchema), ctrl.register);

// PATCH /api/auth/profile
router.patch('/profile', isAuth, ctrl.updateProfile);

// PATCH /api/auth/profile-picture
router.patch('/profile-picture', isAuth, upload.single('profilePicture'), ctrl.updateProfilePicture);

// POST /api/auth/login
router.post('/login', validate(loginSchema), ctrl.login);

// GET /api/auth/me
router.get('/me', isAuth, ctrl.getMe);

// POST /api/auth/refresh-token
router.post('/refresh-token', ctrl.refreshTokenCtrl);

// POST /api/auth/logout
router.post('/logout', ctrl.logout);

// POST /api/auth/request-role
router.post('/request-role', isAuth, validate(roleRequestSchema), ctrl.requestRole);

module.exports = router;
