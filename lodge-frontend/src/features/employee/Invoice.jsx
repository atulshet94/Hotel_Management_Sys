import {
  calculateBookingAmounts,
  formatCurrency,
  formatDate,
  formatDateTime,
  getOutstandingBalance,
} from "../../utils/hotel";

export default function Invoice({ booking, settings }) {
  const billAmounts = calculateBookingAmounts(
    booking.pricePerDay,
    booking.nights,
    booking.advancePayment,
    booking.gstPercentage ?? settings.gstPercentage,
  );

  return (
    <div className="module-card invoice-card">
      <div className="section-heading">
        <div>
          <p className="section-overline">Printable Invoice</p>
          <h2>Booking {booking.bookingCode}</h2>
        </div>
        <button type="button" className="button button--primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="invoice-header">
        <div>
          <h3>{settings.lodgeName}</h3>
          <p>{settings.localAccessUrl}</p>
          <p>{settings.supportPhone || settings.supportEmail || "Local hospitality desk"}</p>
          {settings.gstNumber ? <p>GSTIN: {settings.gstNumber}</p> : null}
        </div>
        <div className="invoice-meta">
          <span>Issued</span>
          <strong>{formatDateTime(booking.checkoutTime || booking.checkinTime || booking.createdAt)}</strong>
        </div>
      </div>

      <div className="invoice-grid">
        <div>
          <span>Guest</span>
          <strong>{booking.guestName}</strong>
          <p>{booking.phone}</p>
          <p>{booking.email || "No email provided"}</p>
        </div>
        <div>
          <span>Stay</span>
          <strong>Room {booking.roomNumber}</strong>
          <p>
            {formatDate(booking.arrivalDate)} to {formatDate(booking.departureDate)}
          </p>
          <p>{booking.roomType}</p>
        </div>
        <div>
          <span>Identity</span>
          <strong>{booking.idType}</strong>
          <p>{booking.idNumber}</p>
          <p>{booking.nationality}</p>
        </div>
      </div>

      <table className="data-table invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Room tariff ({booking.nights} night(s) @ {formatCurrency(booking.pricePerDay)})
            </td>
            <td>{formatCurrency(billAmounts.roomTariff)}</td>
          </tr>
          <tr>
            <td>GST ({billAmounts.gstPercentage}%)</td>
            <td>{formatCurrency(billAmounts.gstAmount)}</td>
          </tr>
          <tr>
            <td>Grand total</td>
            <td>{formatCurrency(billAmounts.finalAmount)}</td>
          </tr>
          <tr>
            <td>Advance paid</td>
            <td>{formatCurrency(booking.advancePayment)}</td>
          </tr>
          <tr className="invoice-table__total">
            <td>Balance due</td>
            <td>{formatCurrency(getOutstandingBalance(booking))}</td>
          </tr>
        </tbody>
      </table>

      <p className="invoice-footer">{settings.billFooter}</p>
    </div>
  );
}
