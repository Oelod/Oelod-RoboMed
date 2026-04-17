const User = require('../models/User');

/**
 * User Repository — all DB access for users lives here.
 * Services call the repository; controllers never call Mongoose directly.
 */

const findById = (id, includePassword = false) => {
  const q = User.findById(id);
  return includePassword ? q.select('+password') : q;
};

const findByEmail = (email, includePassword = false) => {
  const q = User.findOne({ email: email.toLowerCase().trim() });
  return includePassword ? q.select('+password') : q;
};

const findByHospitalId = (hospitalId) =>
  User.findOne({ hospitalId });

const create = (data) => User.create(data);

const updateById = (id, update, options = { new: true, runValidators: true }) =>
  User.findByIdAndUpdate(id, update, options);

const findAll = (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sort = '-createdAt' } = options;
  const skip = (page - 1) * limit;
  return User.find(filter).sort(sort).skip(skip).limit(limit);
};

const countAll = (filter = {}) => User.countDocuments(filter);

const searchText = (query, role) => {
  const filter = { $text: { $search: query } };
  if (role) filter.roles = role;
  return User.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
};

module.exports = {
  findById,
  findByEmail,
  findByHospitalId,
  create,
  updateById,
  findAll,
  countAll,
  searchText,
};
