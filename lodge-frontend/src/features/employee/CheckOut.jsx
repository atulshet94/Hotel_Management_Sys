import { formatCurrency, formatDate, getOutstandingBalance } from "../../utils/hotel";

export default function CheckOut({ bookings, busyBookingId, onCheckout }) {
  if (!bookings.length) {
    return <div className="module-card panel-placeholder">No active check-ins. New arrivals will appear here.</div>;
  }

  return (
    <div className="module-card">
      <div className="section-heading">
        <div>
          <p className="section-overline">Departure Desk</p>
          <h2>Active Stays</h2>
        </div>
        <div className="summary-chip">{bookings.length} guest(s) ready for checkout</div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Stay</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <strong>{booking.bookingCode}</strong>
                  <span className="table-subtext">{booking.idType}</span>
                </td>
                <td>
                  <strong>{booking.guestName}</strong>
                  <span className="table-subtext">{booking.phone}</span>
                </td>
                <td>
                  <strong>{booking.roomNumber}</strong>
                  <span className="table-subtext">{booking.roomType}</span>
                </td>
                <td>
                  <strong>{formatDate(booking.arrivalDate)}</strong>
                  <span className="table-subtext">to {formatDate(booking.departureDate)}</span>
                </td>
                <td>{formatCurrency(getOutstandingBalance(booking))}</td>
                <td>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={busyBookingId === booking.id}
                    onClick={() => {
                      if (window.confirm(`Check out ${booking.guestName} from room ${booking.roomNumber}?`)) {
                        onCheckout(booking.id);
                      }
                    }}
                  >
                    {busyBookingId === booking.id ? "Processing..." : "Check-Out"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
