const asyncHandler = require("../utils/asyncHandler");
const hotelService = require("../services/hotelService");

exports.listBookings = asyncHandler(async (req, res) => {
  const bookings = await hotelService.listBookings(req.query.status);
  res.json(bookings);
});

exports.createBooking = asyncHandler(async (req, res) => {
  const booking = await hotelService.createBooking(req.body);
  res.status(201).json(booking);
});

exports.checkoutBooking = asyncHandler(async (req, res) => {
  const booking = await hotelService.checkoutBooking(req.params.bookingId);
  res.json(booking);
});
