const asyncHandler = require("../utils/asyncHandler");
const { loginWithPassword } = require("../services/authService");

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

exports.login = asyncHandler(async (req, res) => {
  const response = await loginWithPassword(req.body.password, getClientIp(req));
  res.json(response);
});
