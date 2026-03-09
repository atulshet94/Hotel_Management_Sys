import { useState } from "react";
import Invoice from "./Invoice";
import { calculateBookingAmounts, formatCurrency } from "../../utils/hotel";

export default function GenerateBill({ bookings, settings }) {
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const effectiveSelectedBookingId = bookings.some((booking) => String(booking.id) === String(selectedBookingId))
    ? String(selectedBookingId)
    : String(bookings[0]?.id || "");
  const selectedBooking = bookings.find((booking) => String(booking.id) === effectiveSelectedBookingId);
  const billAmounts = selectedBooking
    ? calculateBookingAmounts(
        selectedBooking.pricePerDay,
        selectedBooking.nights,
        selectedBooking.advancePayment,
        selectedBooking.gstPercentage ?? settings.gstPercentage,
      )
    : null;

  if (!bookings.length) {
    return <div className="module-card panel-placeholder">No booking history is available for billing yet.</div>;
  }

  return (
    <div className="module-split">
      <div className="module-card module-card--compact">
        <div className="section-heading">
          <div>
            <p className="section-overline">Billing Desk</p>
            <h2>Generate Invoice</h2>
          </div>
        </div>

        <label>
          Select Booking
          <select value={effectiveSelectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)}>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingCode} - {booking.guestName} - Room {booking.roomNumber}
              </option>
            ))}
          </select>
        </label>

        {selectedBooking ? (
          <div className="detail-list">
            <div>
              <span>Status</span>
              <strong>{selectedBooking.status.replace("_", " ")}</strong>
            </div>
            <div>
              <span>Guest</span>
              <strong>{selectedBooking.guestName}</strong>
            </div>
            <div>
              <span>Room</span>
              <strong>
                {selectedBooking.roomNumber} - {selectedBooking.roomType}
              </strong>
            </div>
            <div>
              <span>Room Tariff</span>
              <strong>{formatCurrency(billAmounts.roomTariff)}</strong>
            </div>
            <div>
              <span>GST ({billAmounts.gstPercentage}%)</span>
              <strong>{formatCurrency(billAmounts.gstAmount)}</strong>
            </div>
            <div>
              <span>Grand Total</span>
              <strong>{formatCurrency(billAmounts.finalAmount)}</strong>
            </div>
          </div>
        ) : null}
      </div>

      {selectedBooking ? <Invoice booking={selectedBooking} settings={settings} /> : null}
    </div>
  );
}
