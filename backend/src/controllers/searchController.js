const searchService = require('../services/searchService');
const res_ = require('../utils/apiResponse');

const search = async (req, res) => {
  const { q, status, priority, specialty } = req.query;
  if (!q) return res_.error(res, 'Search query is required', 400);

  const filters = { status, priority, specialty };
  const results = await searchService.globalSearch(q, req.user._id, req.user.activeRole, filters);
  return res_.success(res, { results }, 'Search completed');
};

const searchUsers = async (req, res) => {
  // Only admin or specific roles should call this usually
  if (req.user.activeRole !== 'admin') return res_.error(res, 'Forbidden', 403);
  
  const { q } = req.query;
  if (!q) return res_.error(res, 'Search query is required', 400);

  const results = await searchService.searchUsers(q);
  return res_.success(res, { users: results }, 'User search completed');
};

module.exports = { search, searchUsers };
