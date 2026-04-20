const userRepo = require('../repositories/userRepository');
const AuditLog = require('../models/AuditLog');
const RefreshToken = require('../models/RefreshToken');
const { generateHospitalId } = require('../utils/idGen');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const emitter = require('../events/emitter');
const crypto = require('crypto');
const emailService = require('./emailService');

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (userData) => {
  const { email, role, profilePicture } = userData;
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const hospitalId = await generateHospitalId();
  
  // Construct user data based on role
  const roles = role === 'doctor' ? ['doctor', 'patient'] : ['patient'];
  const activeRole = role === 'doctor' ? 'doctor' : 'patient';

  // Institutional Serialization: Convert comma-separated string to array
  let specialization = userData.specialization || [];
  if (typeof specialization === 'string') {
    specialization = specialization.split(',').map(s => s.trim()).filter(Boolean);
  }

  const user = await userRepo.create({
    ...userData,
    hospitalId,
    roles,
    activeRole,
    specialization,
    profilePicture: profilePicture || '',
  });

  const tokenPayload = { 
    _id: user._id.toString(), 
    email: user.email, 
    roles: [...user.roles], 
    activeRole: user.activeRole, 
    adminLevel: user.adminLevel || 0 
  };
  const accessToken  = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ _id: user._id });

  // Store refresh token for rotation (7 days expiry matching generator)
  await RefreshToken.create({ 
    token: refreshToken, 
    userId: user._id, 
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
  });

  return { user, accessToken, refreshToken };
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const user = await userRepo.findByEmail(email, true); // include password field
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error('Your account has been suspended. Contact admin.');
    err.statusCode = 403;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const tokenPayload = { 
    _id: user._id.toString(), 
    email: user.email, 
    roles: [...user.roles], 
    activeRole: user.activeRole, 
    specialization: [...user.specialization], 
    adminLevel: user.adminLevel || 0 
  };
  const accessToken  = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ _id: user._id });

  // Store refresh token for rotation
  await RefreshToken.create({ 
    token: refreshToken, 
    userId: user._id, 
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
  });

  // Strip password before returning
  user.password = undefined;
  return { user, accessToken, refreshToken };
};

// ── Refresh token (One-Time-Token Rotation) ───────────────────────────────────
const refreshToken = async (token) => {
  if (!token) {
    const err = new Error('Refresh token missing');
    err.statusCode = 401;
    throw err;
  }

  // Find token in DB
  const existingToken = await RefreshToken.findOne({ token, revoked: false });
  if (!existingToken) {
    const err = new Error('Invalid or revoked session token');
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    await existingToken.deleteOne(); // cleanup
    const err = new Error('Expired session token');
    err.statusCode = 401;
    throw err;
  }

  const user = await userRepo.findById(decoded._id);
  if (!user || user.status === 'suspended') {
    const err = new Error('User not found or suspended');
    err.statusCode = 401;
    throw err;
  }

  // Revoke OLD token (Rotation)
  existingToken.revoked = true;
  await existingToken.save();

  const tokenPayload = { 
    _id: user._id.toString(), 
    email: user.email, 
    roles: [...user.roles], 
    activeRole: user.activeRole, 
    specialization: [...user.specialization], 
    adminLevel: user.adminLevel || 0 
  };
  const newAccessToken  = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken({ _id: user._id });

  // Issue NEW token
  await RefreshToken.create({ 
    token: newRefreshToken, 
    userId: user._id, 
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
  });

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = async (token) => {
  await RefreshToken.updateMany({ token }, { $set: { revoked: true } });
};

// ── Role request ──────────────────────────────────────────────────────────────
const requestRole = async (userId, requestedRole) => {
  const user = await userRepo.updateById(userId, {
    roleRequest: { requestedRole, status: 'pending', requestedAt: new Date() },
  });
  return user;
};

// ── Switch active role ────────────────────────────────────────────────────────
const switchRole = async (userId, role) => {
  const user = await userRepo.findById(userId);
  if (!user.roles.includes(role)) {
    const err = new Error(`You do not have the "${role}" role`);
    err.statusCode = 400;
    throw err;
  }
  return userRepo.updateById(userId, { activeRole: role });
};

// ── Admin: approve role ───────────────────────────────────────────────────────
const approveRole = async (adminId, targetUserId) => {
  const target = await userRepo.findById(targetUserId);
  if (!target) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

  const requestedRole = target.roleRequest?.requestedRole;
  if (!requestedRole) { const e = new Error('No pending role request'); e.statusCode = 400; throw e; }

  const newRoles = [...new Set([...target.roles, requestedRole])];
  const updated  = await userRepo.updateById(targetUserId, {
    roles: newRoles,
    activeRole: target.activeRole,
    status: 'active', // Institutional Activation: Approve role = Verify Identify
    'roleRequest.status':     'approved',
    'roleRequest.reviewedAt': new Date(),
    'roleRequest.reviewedBy': adminId,
  });

  await AuditLog.create({ actorId: adminId, action: 'approve_role', targetId: targetUserId,
    metadata: { role: requestedRole } });

  emitter.emit('role.approved', { userId: targetUserId, role: requestedRole });
  return updated;
};

// ── Admin: reject role ────────────────────────────────────────────────────────
const rejectRole = async (adminId, targetUserId) => {
  const updated = await userRepo.updateById(targetUserId, {
    'roleRequest.status':     'rejected',
    'roleRequest.reviewedAt': new Date(),
    'roleRequest.reviewedBy': adminId,
  });
  await AuditLog.create({ actorId: adminId, action: 'reject_role', targetId: targetUserId });
  return updated;
};

// ── Admin: suspend / activate ─────────────────────────────────────────────────
const suspendUser = async (adminId, targetUserId, adminPassword) => {
  if (adminId.toString() === targetUserId.toString()) {
    const err = new Error('Security Protocol Violation: Self-suspension is strictly prohibited to prevent institutional lockout.');
    err.statusCode = 403;
    throw err;
  }

  const [actor, target] = await Promise.all([
    userRepo.findById(adminId, true), // include password for validation
    userRepo.findById(targetUserId)
  ]);

  if (!target) { 
    const e = new Error('User record not found'); 
    e.statusCode = 404; 
    throw e; 
  }

  // Identity Verification: Admin must confirm with their own password
  const isMatch = await actor.comparePassword(adminPassword);
  if (!isMatch) {
    const err = new Error('Authentication Failure: Invalid administrator password.');
    err.statusCode = 401;
    throw err;
  }

  // Hierarchy Guard: Standard Admins cannot suspend Super Admins
  if (target.adminLevel === 3 && actor.adminLevel < 3) {
    const err = new Error('Insufficient Clearance: Super Admins are immune to secondary administrative suspension.');
    err.statusCode = 403;
    throw err;
  }

  const updated = await userRepo.updateById(targetUserId, { status: 'suspended' });
  await AuditLog.create({ actorId: adminId, action: 'suspend_user', targetId: targetUserId });
  return updated;
};

const activateUser = async (adminId, targetUserId) => {
  const updated = await userRepo.updateById(targetUserId, { status: 'active' });
  await AuditLog.create({ actorId: adminId, action: 'activate_user', targetId: targetUserId });
  return updated;
};

const registerPublicKey = async (userId, publicKey) => {
  return userRepo.updateById(userId, { publicKey });
};

// ── Password Recovery Manifold ──────────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email);
  if (!user) throw new Error('Institutional Registry Failure: Identity not found.');

  // Generate high-entropy recovery token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  await userRepo.updateById(user._id, {
    passwordResetToken: tokenHash,
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
  });

  // Industrial Dispatch: Character-perfectly broadcast the recovery handshake
  await emailService.sendPasswordReset(user.email, resetToken);

  return resetToken;
};

const resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await userRepo.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    const err = new Error('Institutional Protocol Error: Token invalid or expired.');
    err.statusCode = 400;
    throw err;
  }

  // Update password and seal the manifold
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await AuditLog.create({ actorId: user._id, action: 'password_reset', targetId: user._id });
  return user;
};

const IdentityEscrow = require('../models/IdentityEscrow');

const backupIdentity = async (userId, payload) => {
  const { encryptedPrivateKey, salt, iv } = payload;
  return IdentityEscrow.findOneAndUpdate(
    { userId },
    { encryptedPrivateKey, salt, iv },
    { upsert: true, new: true }
  );
};

const restoreIdentity = async (userId) => {
  const escrow = await IdentityEscrow.findOne({ userId });
  if (!escrow) throw new Error('Institutional Registry Failure: No identity backup found for this participant.');
  return escrow;
};

module.exports = {
  register, login, refreshToken, logout, requestRole,
  switchRole, approveRole, rejectRole, suspendUser, activateUser,
  registerPublicKey,
  forgotPassword, 
  resetPassword,
  backupIdentity,
  restoreIdentity
};
