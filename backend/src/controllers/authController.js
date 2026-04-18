const authService = require('../services/authService');
const userRepo    = require('../repositories/userRepository');
const res_        = require('../utils/apiResponse');

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

const cloudinaryService = require('../services/cloudinaryService');

// POST /api/auth/register
const register = async (req, res) => {
  let profilePicture = '';
  
  // If a file was uploaded via multer
  if (req.file) {
    const result = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'robomed/avatars');
    profilePicture = result.secure_url;
  }

  const { user, accessToken, refreshToken } = await authService.register({
    ...req.body,
    profilePicture,
  });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return res_.created(res, { user, token: accessToken }, 'Account created successfully');
};

const updateProfilePicture = async (req, res) => {
  if (!req.file) return res_.error(res, 'No image file provided', 400);

  const result = await cloudinaryService.uploadFromBuffer(req.file.buffer, 'robomed/avatars');
  const user = await userRepo.updateById(req.user._id, { profilePicture: result.secure_url });
  
  return res_.success(res, { user }, 'Profile picture updated');
};

const updateProfile = async (req, res) => {
  const { fullName, phoneNumber } = req.body;
  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (phoneNumber) updates.phoneNumber = phoneNumber;

  const user = await userRepo.updateById(req.user._id, updates);
  return res_.success(res, { user }, 'Profile updated successfully');
};

// POST /api/auth/login
const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return res_.success(res, { user, token: accessToken }, 'Login successful');
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = await userRepo.findById(req.user._id);
  if (!user) return res_.notFound(res, 'User not found');
  return res_.success(res, { user });
};

// POST /api/auth/refresh-token
const refreshTokenCtrl = async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { user, accessToken, refreshToken } = await authService.refreshToken(token);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  return res_.success(res, { user, token: accessToken }, 'Token refreshed');
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) await authService.logout(token);
  res.clearCookie('refreshToken', COOKIE_OPTS);
  return res_.success(res, {}, 'Logged out from institutional session');
};

// POST /api/auth/request-role
const requestRole = async (req, res) => {
  const { role } = req.body;
  const user = await authService.requestRole(req.user._id, role);
  return res_.success(res, { user }, 'Role request submitted');
};

const updatePublicKey = async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) return res_.error(res, 'Internal Protocol Error: Public key character-string is required.', 400);
  
  const user = await authService.registerPublicKey(req.user._id, publicKey);
  return res_.success(res, { user }, 'Cryptographic identity established.');
};

const getPublicKey = async (req, res) => {
  const user = await userRepo.findById(req.params.userId);
  if (!user || !user.publicKey) return res_.notFound(res, 'Target identity not found in Registry.');
  return res_.success(res, { publicKey: user.publicKey });
};

module.exports = { register, updateProfilePicture, updateProfile, login, getMe, refreshTokenCtrl, logout, requestRole, updatePublicKey, getPublicKey };
