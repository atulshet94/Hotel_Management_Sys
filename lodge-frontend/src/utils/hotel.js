export const ID_TYPES = ["Aadhaar Card", "Passport", "Driving Licence", "Voter ID", "PAN Card"];
export const GST_RATE = 0.18;
export const GST_PERCENTAGE = 18;
export const DEFAULT_SYSTEM_SETTINGS = {
  lodgeName: "Sanman Lodge",
  localAccessUrl: "http://localhost:3000",
  gstPercentage: 18,
  gstNumber: "",
  billPrefix: "SNL",
  supportPhone: "",
  supportEmail: "",
  billFooter: "Thank you for choosing Sanman Lodge.",
};

export function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function createEmptyCheckInForm() {
  const arrivalDate = getTodayDate();

  return {
    guestName: "",
    phone: "",
    email: "",
    address: "",
    idType: ID_TYPES[0],
    idNumber: "",
    nationality: "Indian",
    arrivalDate,
    departureDate: addDays(arrivalDate, 1),
    roomId: "",
    roomRent: "",
    adults: 1,
    children: 0,
    specialRequests: "",
    advancePayment: 0,
    idPhoto: "",
    guestPhoto: "",
  };
}

export function calculateNights(arrivalDate, departureDate) {
  if (!arrivalDate || !departureDate) {
    return 0;
  }

  const arrival = new Date(`${arrivalDate}T00:00:00`);
  const departure = new Date(`${departureDate}T00:00:00`);
  const diff = departure.getTime() - arrival.getTime();

  return diff > 0 ? Math.round(diff / (24 * 60 * 60 * 1000)) : 0;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateValue));
}

export function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

export function getOutstandingBalance(booking) {
  return Number(booking?.finalAmount || 0) - Number(booking?.advancePayment || 0);
}

export function calculateBookingAmounts(roomRent, nights, advancePayment = 0, gstPercentage = GST_PERCENTAGE) {
  const safeRoomRent = Math.max(0, Number(roomRent || 0));
  const safeNights = Math.max(0, Number(nights || 0));
  const safeAdvancePayment = Math.max(0, Number(advancePayment || 0));
  const safeGstPercentage = Math.max(0, Number(gstPercentage || 0));
  const roomTariff = Number((safeRoomRent * safeNights).toFixed(2));
  const gstAmount = Number((roomTariff * (safeGstPercentage / 100)).toFixed(2));
  const finalAmount = Number((roomTariff + gstAmount).toFixed(2));
  const balanceDue = Number((finalAmount - safeAdvancePayment).toFixed(2));

  return {
    roomRent: safeRoomRent,
    gstPercentage: safeGstPercentage,
    roomTariff,
    gstAmount,
    finalAmount,
    advancePayment: safeAdvancePayment,
    balanceDue,
  };
}

export function createSearchText(booking) {
  return [
    booking.bookingCode,
    booking.guestName,
    booking.phone,
    booking.idNumber,
    booking.roomNumber,
    booking.roomType,
    booking.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
