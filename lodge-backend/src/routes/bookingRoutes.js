const express = require("express");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

router.get("/", bookingController.listBookings);
router.post("/", bookingController.createBooking);
router.patch("/:bookingId/checkout", bookingController.checkoutBooking);

module.exports = router;
