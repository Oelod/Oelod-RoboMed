const Case = require('../models/Case');
const User = require('../models/User');

const globalSearch = async (query, userId, activeRole, filters = {}) => {
  const isDoc = activeRole === 'doctor';
  const isAdmin = activeRole === 'admin';
  const isCaseCode = /^(CASE-\d{4}|RM-\d{4}-\d{4})$/i.test(query);

  // 1. Determine baseline visibility scoping
  let scopeFilter = {};
  if (activeRole === 'patient') {
    scopeFilter.patient = userId;
  } else if (isDoc) {
    const user = await User.findById(userId);
    const activePatientIds = await Case.find({ doctor: userId, status: 'assigned' }).distinct('patient');
    scopeFilter.$or = [
      { doctor: userId },
      { status: 'open', assignedSpecialty: { $in: user.specialization || [] } },
      { patient: { $in: activePatientIds } }
    ];
  }

  // 2. Identify potential patient matches by name
  let patientIds = [];
  if (isDoc || isAdmin) {
    const usersFound = await User.find({ fullName: { $regex: query, $options: 'i' }, roles: 'patient' }).select('_id');
    patientIds = usersFound.map(u => u._id);
  }

  // 3. Build query components
  const searchComponents = [];
  if (isCaseCode) {
    searchComponents.push({ caseCode: query.toUpperCase() });
  } else {
    searchComponents.push({ $text: { $search: query } });
  }
  if (patientIds.length > 0) searchComponents.push({ patient: { $in: patientIds } });

  // 4. Incorporate Filters
  const filterCriteria = {};
  if (filters.status) filterCriteria.status = filters.status;
  if (filters.priority) filterCriteria.priority = filters.priority;
  if (filters.specialty) filterCriteria.assignedSpecialty = filters.specialty;

  // 5. Combine everything
  const searchOr = { $or: searchComponents };
  let executableFilter = {};
  
  if (isAdmin) {
    executableFilter = { ...searchOr, ...filterCriteria };
  } else {
    executableFilter = { $and: [scopeFilter, searchOr, filterCriteria] };
  }

  const cases = await Case.find(executableFilter)
    .sort(query.length > 0 && !isCaseCode ? { score: { $meta: 'textScore' } } : '-createdAt')
    .limit(50)
    .populate('patient', 'fullName email profilePicture hospitalId')
    .populate('doctor', 'fullName profilePicture hospitalId');

  let users = [];
  if (isAdmin || isDoc) {
    // Also search users directly if not a strict Case Code search
    if (!isCaseCode) {
      users = await User.find({ 
        $or: [
          { $text: { $search: query } },
          { hospitalId: { $regex: query, $options: 'i' } }
        ]
      })
      .select('fullName email hospitalId roles profilePicture specialization')
      .limit(10);
    } else {
      // If it looks like a case code, maybe it's actually an HSP- ID
      const maybeUser = await User.findOne({ hospitalId: query.toUpperCase() })
        .select('fullName email hospitalId roles profilePicture specialization');
      if (maybeUser) users = [maybeUser];
    }
  }

  return { cases, users };
};

const searchUsers = async (query) => {
  return await User.find({ $text: { $search: query } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
};

module.exports = { globalSearch, searchUsers };
