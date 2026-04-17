const express = require('express');
const router  = express.Router();
const Joi     = require('joi');
const { isAuth }   = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const ctrl         = require('../controllers/dashboardController');

const switchRoleSchema = Joi.object({
  role: Joi.string().valid('patient', 'doctor', 'admin', 'lab', 'pharmacist').required(),
});

router.use(isAuth);

router.get('/summary',                       ctrl.getSummary);
router.patch('/switch-role', validate(switchRoleSchema), ctrl.switchRole);
router.get('/widgets',                       ctrl.getWidgets);

module.exports = router;
