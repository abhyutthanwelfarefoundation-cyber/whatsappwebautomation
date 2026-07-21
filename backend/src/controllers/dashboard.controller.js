const dashboardRepo = require('../repositories/dashboard.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getStats = asyncHandler(async (req, res) => {
  const [stats, recentActivity] = await Promise.all([
    dashboardRepo.getStats(),
    dashboardRepo.getRecentActivity(),
  ]);
  return new ApiResponse(200, { stats, recentActivity }).send(res);
});

module.exports = { getStats };