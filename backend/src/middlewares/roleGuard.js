const { forbidden } = require('../utils/apiResponse');

/**
 * requireRole(...roles) — role-based guard factory.
 * Call after isAuth in the route chain.
 *
 * Checks req.user.activeRole (the currently active role the user is operating as).
 *
 * Example:
 *   router.get('/admin/users', isAuth, requireRole('admin'), controller);
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.activeRole)) {
    return forbidden(res, `Forbidden: requires role ${roles.join(' or ')}`);
  }
  next();
};

/**
 * Shorthand guards for the most common role checks.
 */
const isAdmin = requireRole('admin');
const isDoctor = requireRole('doctor');
const isPatient = requireRole('patient');
const isDoctorOrAdmin = requireRole('doctor', 'admin');

module.exports = { requireRole, isAdmin, isDoctor, isPatient, isDoctorOrAdmin };
