const searchRepo = require('../repositories/search.repository');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const search = asyncHandler(async (req, res) => {
  const results = await searchRepo.globalSearch(req.query.query);
  return new ApiResponse(200, results).send(res);
});

module.exports = { search };
