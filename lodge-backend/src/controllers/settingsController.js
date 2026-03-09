const asyncHandler = require("../utils/asyncHandler");
const settingsService = require("../services/settingsService");

exports.getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.getSettings();
  res.json(settings);
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  res.json(settings);
});
