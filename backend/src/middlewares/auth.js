const { verifyAccessToken } = require('../utils/generateToken');
const { unauthorized } = require('../utils/apiResponse');

/**
 * isAuth — verifies Bearer JWT on every protected route.
 * Attaches decoded user payload to req.user.
 */
const isAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Unauthorized: No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return unauthorized(res, 'Unauthorized: Token invalid or expired');
  }
};

module.exports = { isAuth };
