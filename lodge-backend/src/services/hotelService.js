const { randomInt } = require("crypto");
const db = require("../config/db");
const createHttpError = require("../utils/httpError");
const { getSettings } = require("./settingsService");

let bookingSchemaReady = false;

async function ensureBookingSchema(connection = db) {
  if (bookingSchemaReady) {
    return;
  }

  const [rows] = await connection.query(`
    SELECT COUNT(*) AS column_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = 'gst_percentage'
  `);

  if (!Number(rows[0]?.column_count || 0)) {
    await connection.query(`
      ALTER TABLE bookings
      ADD COLUMN gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 18.00
      AFTER total_amount
    `);
  }

  bookingSchemaReady = true;
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function calculateNights(arrivalDate, departureDate) {
  const arrival = parseDate(arrivalDate);
  const departure = parseDate(departureDate);
  const difference = departure.getTime() - arrival.getTime();
  return difference > 0 ? Math.round(difference / (24 * 60 * 60 * 1000)) : 0;
}

function generateBookingCode(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${randomInt(100, 999)}`;
}

function mapRoom(row) {
  return {
    id: row.id,
    number: row.room_number,
    type: row.room_type,
    floor: row.floor_label,
    pricePerDay: Number(row.price_per_day),
    status: row.status,
    guestName: row.guest_name || null,
    arrivalDate: row.arrival_date || null,
    departureDate: row.departure_date || null,
    bookingCode: row.booking_code || null,
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    guestName: row.guest_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    idType: row.id_type,
    idNumber: row.id_number,
    nationality: row.nationality,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    nights: Number(row.nights),
    adults: Number(row.adults),
    children: Number(row.children),
    specialRequests: row.special_requests,
    advancePayment: Number(row.advance_payment),
    pricePerDay: Number(row.price_per_day),
    totalAmount: Number(row.total_amount),
    gstPercentage: Number(row.gst_percentage),
    gstAmount: Number(row.gst_amount),
    finalAmount: Number(row.final_amount),
    idPhoto: row.id_photo,
    guestPhoto: row.guest_photo,
    status: row.status,
    checkinTime: row.checkin_time,
    checkoutTime: row.checkout_time,
    createdAt: row.created_at,
    roomId: row.room_id,
    roomNumber: row.room_number,
    roomType: row.room_type,
    floor: row.floor_label,
  };
}

async function getDashboardSummary() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM bookings WHERE status = 'checked_in') AS active_guests,
      (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') AS occupied_rooms,
      (SELECT COUNT(*) FROM rooms WHERE status = 'available') AS available_rooms,
      (SELECT COUNT(*) FROM rooms) AS total_rooms,
      (SELECT COUNT(*) FROM bookings) AS total_bookings,
      (SELECT COALESCE(SUM(final_amount), 0) FROM bookings WHERE DATE(created_at) = CURDATE()) AS today_revenue
  `);

  const summary = rows[0] || {};
  const totalRooms = Number(summary.total_rooms || 0);
  const occupiedRooms = Number(summary.occupied_rooms || 0);

  return {
    activeGuests: Number(summary.active_guests || 0),
    occupiedRooms,
    availableRooms: Number(summary.available_rooms || 0),
    totalRooms,
    totalBookings: Number(summary.total_bookings || 0),
    todayRevenue: Number(summary.today_revenue || 0),
    occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
  };
}

async function listRooms() {
  const [rows] = await db.query(`
    SELECT
      rooms.id,
      rooms.room_number,
      rooms.room_type,
      rooms.floor_label,
      rooms.price_per_day,
      rooms.status,
      bookings.guest_name,
      bookings.arrival_date,
      bookings.departure_date,
      bookings.booking_code
    FROM rooms
    LEFT JOIN bookings
      ON bookings.room_id = rooms.id
      AND bookings.status = 'checked_in'
    ORDER BY rooms.room_number
  `);

  return rows.map(mapRoom);
}

async function listBookings(status) {
  await ensureBookingSchema();
  let query = `
    SELECT
      bookings.id,
      bookings.booking_code,
      bookings.guest_name,
      bookings.phone,
      bookings.email,
      bookings.address,
      bookings.id_type,
      bookings.id_number,
      bookings.nationality,
      bookings.arrival_date,
      bookings.departure_date,
      bookings.nights,
      bookings.adults,
      bookings.children,
      bookings.special_requests,
      bookings.advance_payment,
      bookings.price_per_day,
      bookings.total_amount,
      bookings.gst_percentage,
      bookings.gst_amount,
      bookings.final_amount,
      bookings.id_photo,
      bookings.guest_photo,
      bookings.status,
      bookings.checkin_time,
      bookings.checkout_time,
      bookings.created_at,
      bookings.room_id,
      rooms.room_number,
      rooms.room_type,
      rooms.floor_label
    FROM bookings
    INNER JOIN rooms ON rooms.id = bookings.room_id
  `;

  const params = [];
  if (status) {
    query += " WHERE bookings.status = ?";
    params.push(status);
  }

  query += " ORDER BY COALESCE(bookings.checkin_time, bookings.created_at) DESC, bookings.id DESC";

  const [rows] = await db.query(query, params);
  return rows.map(mapBooking);
}

async function getBookingById(bookingId) {
  const bookings = await listBookings();
  const booking = bookings.find((item) => Number(item.id) === Number(bookingId));

  if (!booking) {
    throw createHttpError(404, "Booking not found.");
  }

  return booking;
}

function validateBookingPayload(payload) {
  const requiredFields = [
    ["guestName", "Guest name is required."],
    ["phone", "Phone number is required."],
    ["idNumber", "ID number is required."],
    ["arrivalDate", "Arrival date is required."],
    ["departureDate", "Departure date is required."],
    ["roomId", "Room selection is required."],
  ];

  for (const [field, message] of requiredFields) {
    if (!payload[field]) {
      throw createHttpError(400, message);
    }
  }

  const nights = calculateNights(payload.arrivalDate, payload.departureDate);
  if (nights <= 0) {
    throw createHttpError(400, "Departure date must be after the arrival date.");
  }

  if (Number(payload.roomRent) <= 0) {
    throw createHttpError(400, "Room rent must be greater than zero.");
  }

  return nights;
}

async function createBooking(payload) {
  const nights = validateBookingPayload(payload);
  const connection = await db.getConnection();

  try {
    await ensureBookingSchema(connection);
    await connection.beginTransaction();

    const [roomRows] = await connection.query(
      "SELECT id, room_number, room_type, floor_label, price_per_day, status FROM rooms WHERE id = ? FOR UPDATE",
      [payload.roomId],
    );

    const room = roomRows[0];
    if (!room) {
      throw createHttpError(404, "Selected room was not found.");
    }

    if (room.status !== "available") {
      throw createHttpError(409, "Selected room is no longer available.");
    }

    const settings = await getSettings(connection);
    const advancePayment = Number(payload.advancePayment || 0);
    const enteredRoomRent = Number(payload.roomRent);
    const pricePerDay = Number.isFinite(enteredRoomRent) && enteredRoomRent > 0
      ? enteredRoomRent
      : Number(room.price_per_day);
    const gstPercentage = Number(settings.gstPercentage || 0);
    const gstRate = gstPercentage / 100;
    const totalAmount = Number((pricePerDay * nights).toFixed(2));
    const gstAmount = Number((totalAmount * gstRate).toFixed(2));
    const finalAmount = Number((totalAmount + gstAmount).toFixed(2));
    const bookingCode = generateBookingCode(settings.billPrefix || "SNL");

    const [insertResult] = await connection.query(
      `
        INSERT INTO bookings (
          booking_code,
          room_id,
          guest_name,
          phone,
          email,
          address,
          id_type,
          id_number,
          nationality,
          arrival_date,
          departure_date,
          nights,
          adults,
          children,
          special_requests,
          advance_payment,
          price_per_day,
          total_amount,
          gst_percentage,
          gst_amount,
          final_amount,
          id_photo,
          guest_photo,
          status,
          checkin_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in', NOW())
      `,
      [
        bookingCode,
        room.id,
        payload.guestName.trim(),
        payload.phone.trim(),
        payload.email?.trim() || null,
        payload.address?.trim() || null,
        payload.idType || "Aadhaar Card",
        payload.idNumber.trim(),
        payload.nationality?.trim() || "Indian",
        payload.arrivalDate,
        payload.departureDate,
        nights,
        Number(payload.adults || 1),
        Number(payload.children || 0),
        payload.specialRequests?.trim() || null,
        advancePayment,
        pricePerDay,
        totalAmount,
        gstPercentage,
        gstAmount,
        finalAmount,
        payload.idPhoto || null,
        payload.guestPhoto || null,
      ],
    );

    await connection.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [room.id]);
    await connection.commit();

    return getBookingById(insertResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function checkoutBooking(bookingId) {
  const connection = await db.getConnection();

  try {
    await ensureBookingSchema(connection);
    await connection.beginTransaction();

    const [bookingRows] = await connection.query(
      "SELECT id, room_id, guest_name, status FROM bookings WHERE id = ? FOR UPDATE",
      [bookingId],
    );

    const booking = bookingRows[0];
    if (!booking) {
      throw createHttpError(404, "Booking not found.");
    }

    if (booking.status !== "checked_in") {
      throw createHttpError(409, "This booking has already been checked out.");
    }

    await connection.query("UPDATE bookings SET status = 'checked_out', checkout_time = NOW() WHERE id = ?", [bookingId]);
    await connection.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_id]);

    await connection.commit();

    return getBookingById(bookingId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createBooking,
  checkoutBooking,
  getBookingById,
  getDashboardSummary,
  listBookings,
  listRooms,
};
