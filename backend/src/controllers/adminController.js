const authService    = require('../services/authService');
const userRepo       = require('../repositories/userRepository');
const AuditLog       = require('../models/AuditLog');
const AnonymizedCase = require('../models/AnonymizedCase');
const res_           = require('../utils/apiResponse');
const { generateCSV } = require('../utils/csvExport');

// ── GET /api/admin/users ─────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  const { page = 1, limit = 20, role, status } = req.query;
  const filter = {};
  if (role)   filter.roles   = role;
  if (status) filter.status  = status;

  const [users, total] = await Promise.all([
    userRepo.findAll(filter, { page: +page, limit: +limit }),
    userRepo.countAll(filter),
  ]);

  res.setHeader('X-Total-Count', total);
  return res_.success(res, { users, total, page: +page, limit: +limit }, 'Users fetched successfully');
};

// ── GET /api/admin/users/:userId ─────────────────────────────────────────────
const getUserById = async (req, res) => {
  const user = await userRepo.findById(req.params.userId);
  if (!user) return res_.notFound(res, 'User not found');
  return res_.success(res, { user });
};

// ── PATCH /api/admin/users/:userId/approve-role ──────────────────────────────
const approveRole = async (req, res) => {
  const user = await authService.approveRole(req.user._id, req.params.userId);
  return res_.success(res, { user }, 'Role approved successfully');
};

// ── PATCH /api/admin/users/:userId/reject-role ───────────────────────────────
const rejectRole = async (req, res) => {
  const user = await authService.rejectRole(req.user._id, req.params.userId);
  return res_.success(res, { user }, 'Role request rejected');
};

// ── PATCH /api/admin/users/:userId/roles ─────────────────────────────────────
const updateRoles = async (req, res) => {
  const { roles, activeRole, adminLevel } = req.body;
  const targetId = req.params.userId;
  const actorId = req.user._id;

  const [actor, target] = await Promise.all([
    userRepo.findById(actorId),
    userRepo.findById(targetId)
  ]);

  // Prevent self-degradation of authority
  if (targetId.toString() === actorId.toString() && typeof adminLevel !== 'undefined' && adminLevel < target.adminLevel) {
    return res_.forbidden(res, 'Security Restriction: You cannot lower your own governance clearance level.');
  }

  // Prevent non-super-admins from modifying a Super Admin (L3)
  if (target.adminLevel === 3 && actor.adminLevel < 3) {
    return res_.forbidden(res, 'Insufficient Clearance: Super Admins can only be modified by other Super Admins.');
  }

  const updateData = {};
  if (roles) updateData.roles = roles;
  if (activeRole) updateData.activeRole = activeRole;
  if (typeof adminLevel !== 'undefined') updateData.adminLevel = adminLevel;
  
  const user = await userRepo.updateById(targetId, updateData);
  await AuditLog.create({ actorId, action: 'update_roles',
    targetId, metadata: { roles, activeRole, adminLevel } });
  
  const emitter = require('../events/emitter');
  emitter.emit('role.updated', { userId: targetId, roles, activeRole, adminLevel });

  return res_.success(res, { user }, 'Roles updated successfully');
};

// ── PATCH /api/admin/users/:userId/suspend ───────────────────────────────────
const suspendUser = async (req, res) => {
  const { adminPassword } = req.body;
  if (!adminPassword) return res_.error(res, 'Verification Required: Provide administrator password to confirm suspension.', 400);

  try {
    const user = await authService.suspendUser(req.user._id, req.params.userId, adminPassword);
    return res_.success(res, { user }, 'User suspended');
  } catch (err) {
    return res_.error(res, err.message, err.statusCode || 500);
  }
};

// ── PATCH /api/admin/users/:userId/activate ──────────────────────────────────
const activateUser = async (req, res) => {
  const user = await authService.activateUser(req.user._id, req.params.userId);
  return res_.success(res, { user }, 'User activated');
};

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
const getStats = async (req, res) => {
  const User = require('../models/User');
  const Case = require('../models/Case');
  
  const [userStats, caseStats] = await Promise.all([
    User.aggregate([
      {
        $facet: {
          byRole: [{ $unwind: '$roles' }, { $group: { _id: '$roles', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          total: [{ $count: 'count' }],
        },
      },
    ]),
    Case.aggregate([
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          avgConfidence: [{ $match: { aiPrediction: { $ne: null } } }, { $group: { _id: null, avg: { $avg: '$aiPrediction.confidence_score' } } }],
          total: [{ $count: 'count' }],
        }
      }
    ])
  ]);

  return res_.success(res, { 
    users: userStats[0], 
    cases: caseStats[0] 
  }, 'System stats fetched successfully');
};

// ── GET /api/admin/audit-log ─────────────────────────────────────────────────
const getAuditLog = async (req, res) => {
  const { from, to, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  const skip = (page - 1) * limit;
  const logs = await AuditLog.find(filter).sort('-createdAt').skip(skip).limit(+limit)
    .populate('actorId', 'fullName email').populate('targetId', 'fullName email');
  const total = await AuditLog.countDocuments(filter);
  res.setHeader('X-Total-Count', total);
  return res_.success(res, { logs, total }, 'Audit log fetched successfully');
};

/**
 * GET /api/admin/compliance-report/:userId
 * Aggregates all PHI access logs and status changes for a specific user
 */
const getComplianceReport = async (req, res) => {
  const { userId } = req.params;
  const user = await userRepo.findById(userId);
  if (!user) return res_.notFound(res, 'User record not found');

  const logs = await AuditLog.find({ 
    $or: [
      { targetId: userId },
      { 'metadata.patientId': userId }
    ]
  })
  .populate('actorId', 'fullName roles email')
  .sort('-createdAt');

  return res_.success(res, { 
    report: {
      patient: { 
        id: user._id, 
        fullName: user.fullName, 
        hospitalId: user.hospitalId 
      },
      auditTrail: logs,
      generatedAt: new Date()
    }
  }, 'Compliance report generated successfully');
};

/**
 * GET /api/admin/escalated-matters
 * Fetches cases specifically escalated to the assigned office of the logged-in admin.
 */
const getEscalatedCases = async (req, res) => {
  const Case = require('../models/Case');
  const user = await userRepo.findById(req.user._id);
  
  if (!user.assignedOffice) {
    return res_.forbidden(res, 'Institutional Access Restricted: You are not assigned to a Governance Office.');
  }

  // ── Stream 1: Formal Escalations specifically to this office ─────────────────
  const escalated = await Case.find({ 
    status: 'escalated',
    'governanceNotes.office': user.assignedOffice 
  })
  .populate('patient', 'fullName hospitalId')
  .populate('doctor',  'fullName specialization')
  .sort('-updatedAt');

  // ── Stream 2: General Clinical Oversight (Flagged cases) ─────────────────────
  // Only the CMO has full visibility into the Flag Registry.
  let flagged = [];
  if (user.assignedOffice === 'Chief Medical Office (CMO)') {
    flagged = await Case.find({ status: 'flagged' })
      .populate('patient', 'fullName hospitalId')
      .populate('doctor',  'fullName specialization')
      .sort('-updatedAt');
  }

  return res_.success(res, { escalated, flagged }, `Departmental Oversight Streams for ${user.assignedOffice} retrieved successfully.`);
};

/**
 * PATCH /api/admin/users/:userId/office
 * Allows a Super Admin to assign a user to a specific governance office.
 */
const updateOffice = async (req, res) => {
  if (req.user.adminLevel < 3) return res_.forbidden(res, 'Super Admin required for office delegation.');
  const { assignedOffice } = req.body;
  
  const user = await userRepo.updateById(req.params.userId, { assignedOffice });
  await AuditLog.create({ actorId: req.user._id, action: 'update_office', targetId: req.params.userId, metadata: { assignedOffice } });

  return res_.success(res, { user }, 'Office assignment updated');
};

/**
 * GET /api/admin/governance-health
 * Returns high-level metrics on the performance of the institutional resolution framework.
 */
const getGovernanceHealth = async (req, res) => {
  if (req.user.adminLevel < 3) return res_.forbidden(res, 'Super Admin required for governance performance metrics.');
  
  const Case = require('../models/Case');
  
  const health = await Case.aggregate([
    {
      $facet: {
        officePerformance: [
          { $unwind: "$governanceNotes" },
          { $group: { 
            _id: { office: "$governanceNotes.office", action: "$governanceNotes.action" },
            count: { $sum: 1 }
          }},
          { $group: {
            _id: "$_id.office",
            actions: { $push: { type: "$_id.action", count: "$count" } }
          }}
        ],
        efficiencyMetrics: [
          { $match: { status: { $in: ['resolved', 'closed'] } } },
          { $project: {
            resolutionTime: {
              $subtract: [
                "$updatedAt",
                { $ifNull: [
                  { $min: "$governanceNotes.timestamp" },
                  "$createdAt"
                ]}
              ]
            }
          }},
          { $group: {
            _id: null,
            avgResolutionTime: { $avg: "$resolutionTime" },
            maxResolutionTime: { $max: "$resolutionTime" },
            count: { $sum: 1 }
          }}
        ],
        specialtyFlags: [
          { $match: { status: { $ne: 'open' } } },
          { $group: { _id: "$assignedSpecialty", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        recentResolutions: [
          { $match: { status: { $in: ['resolved', 'closed'] } } },
          { $sort: { updatedAt: -1 } },
          { $limit: 10 },
          { $project: {
            caseCode: 1,
            updatedAt: 1,
            lastNote: { $arrayElemAt: ["$governanceNotes", -1] }
          }}
        ],
        aiPerformance: [
          { $match: { "aiPrediction.latency_ms": { $ne: null } } },
          { $group: {
            _id: null,
            avgLatency: { $avg: "$aiPrediction.latency_ms" },
            maxLatency: { $max: "$aiPrediction.latency_ms" },
            totalInferences: { $sum: 1 }
          }}
        ]
      }
    }
  ]);

  return res_.success(res, { health: health[0] }, 'Governance health metrics retrieved.');
};

const ingestionService = require('../services/dataIngestionService');

/**
 * POST /api/admin/migrate
 * Body: { type: 'patients' | 'doctors', data: [...] }
 * Orchestrates bulk institutional data ingestion.
 */
const migrateData = async (req, res) => {
  if (req.user.adminLevel < 3) return res_.forbidden(res, 'Super Admin required for institutional data migration.');
  
  const { type, data } = req.body;
  if (!type || !Array.isArray(data)) {
    return res_.error(res, 'Invalid migration payload. Required: { type: String, data: Array }', 400);
  }

  try {
    let results;
    if (type === 'patients') {
      results = await ingestionService.ingestLegacyPatients(data, req.user._id);
    } else if (type === 'doctors') {
      results = await ingestionService.ingestLegacyDoctors(data, req.user._id);
    } else {
      return res_.error(res, 'Unsupported migration type.', 400);
    }
    
    return res_.success(res, results, `Institutional ${type} migration complete.`);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    return res_.error(res, 'Migration stream interrupted: ' + err.message, 500);
  }
};

/**
 * GET /api/admin/reports/governance-audit
 * Exports entire institutional audit history for regulatory oversight.
 */
const downloadGovernanceReport = async (req, res) => {
  if (req.user.adminLevel < 3) return res_.forbidden(res, 'Super Admin required for institutional data extraction.');

  const logs = await AuditLog.find()
    .populate('actorId', 'fullName roles email hospitalId')
    .populate('targetId', 'fullName roles email hospitalId')
    .sort('-createdAt');

  const fields = [
    { label: 'Event Date', key: 'createdAt' },
    { label: 'Action Code', key: 'action' },
    { label: 'Operator Name', key: 'actorId.fullName' },
    { label: 'Operator Title', key: 'actorId.roles' },
    { label: 'Subject Name', key: 'targetId.fullName' },
    { label: 'Metadata Fragment', key: 'metadata' }
  ];

  const csv = generateCSV(logs, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=RoboMed_Institutional_Audit.csv');
  return res.send(csv);
};

/**
 * GET /api/admin/reports/research-vault
 * Exports the entire Anonymized Research Vault for clinical study.
 * Access Level: Super Admin (L3)
 */
const exportResearchData = async (req, res) => {
  if (req.user.adminLevel < 3) return res_.forbidden(res, 'Super Admin required for extraction of the Research Vault.');

  const researchData = await AnonymizedCase.find().sort('-capturedAt');

  const fields = [
    { label: 'Capture Date', key: 'capturedAt' },
    { label: 'Patient Age', key: 'age' },
    { label: 'Gender', key: 'gender' },
    { label: 'Symptoms Detected', key: 'symptoms' },
    { label: 'Clinical Description', key: 'description' },
    { label: 'Final Diagnosis', key: 'diagnosis' },
    { label: 'Assigned Specialty', key: 'specialty' },
    { label: 'Case Priority', key: 'priority' }
  ];

  const csv = generateCSV(researchData, fields);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=RoboMed_Anonymized_Research_Vault.csv');
  return res.send(csv);
};

module.exports = { 
  getUsers, getUserById, approveRole, rejectRole, updateRoles,
  suspendUser, activateUser, getStats, getAuditLog, getComplianceReport,
  getEscalatedCases, updateOffice, getGovernanceHealth, migrateData,
  downloadGovernanceReport, exportResearchData
};
