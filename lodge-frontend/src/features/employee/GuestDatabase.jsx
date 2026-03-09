import { useDeferredValue, useState } from "react";
import { createSearchText, formatCurrency, formatDate } from "../../utils/hotel";

export default function GuestDatabase({ bookings }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchText = deferredQuery.trim().toLowerCase();

  const filteredBookings = bookings.filter((booking) => {
    if (!searchText) {
      return true;
    }

    return createSearchText(booking).includes(searchText);
  });

  return (
    <div className="module-card">
      <div className="section-heading">
        <div>
          <p className="section-overline">Guest Records</p>
          <h2>Searchable Booking Database</h2>
        </div>
        <div className="summary-chip">{filteredBookings.length} record(s)</div>
      </div>

      <label className="search-field">
        Search by guest, phone, booking code, room, or ID number
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guest records"
        />
      </label>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Final Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
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
                <td>
                  <span className={`status-pill status-pill--${booking.status}`}>{booking.status.replace("_", " ")}</span>
                </td>
                <td>{formatCurrency(booking.finalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
