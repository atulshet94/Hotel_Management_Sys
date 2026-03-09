const asyncHandler = require("../utils/asyncHandler");
const { getDashboardSummary } = require("../services/hotelService");

exports.getSummary = asyncHandler(async (_req, res) => {
  const summary = await getDashboardSummary();
  res.json(summary);
});
