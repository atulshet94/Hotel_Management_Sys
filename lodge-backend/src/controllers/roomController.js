const asyncHandler = require("../utils/asyncHandler");
const { listRooms } = require("../services/hotelService");

exports.listRooms = asyncHandler(async (_req, res) => {
  const rooms = await listRooms();
  res.json(rooms);
});
