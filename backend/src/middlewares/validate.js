const { error } = require('../utils/apiResponse');

/**
 * validate(schema) — Joi validation middleware factory.
 * Validates req.body against the provided Joi schema.
 * Strips unknown keys by default; abortEarly=false returns all errors at once.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register);
 */
const validate = (schema) => (req, res, next) => {
  const { error: validationError, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (validationError) {
    const message = validationError.details.map((d) => d.message).join('; ');
    return error(res, message, 400);
  }

  req.body = value; // replace body with sanitised value
  next();
};

module.exports = { validate };
