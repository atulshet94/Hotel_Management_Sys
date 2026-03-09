import { formatCurrency, formatDate } from "../../utils/hotel";

export default function RoomAvailability({ rooms }) {
  if (!rooms.length) {
    return <div className="module-card panel-placeholder">Room inventory will appear here once the backend is running.</div>;
  }

  return (
    <div className="room-grid">
      {rooms.map((room) => (
        <article key={room.id} className={`room-card room-card--${room.status}`}>
          <div className="room-card__header">
            <div>
              <p className="room-label">Room {room.number}</p>
              <h3>{room.type}</h3>
            </div>
            <span className={`status-pill status-pill--${room.status}`}>{room.status}</span>
          </div>

          <div className="detail-list">
            <div>
              <span>Rate</span>
              <strong>{formatCurrency(room.pricePerDay)}</strong>
            </div>
            <div>
              <span>Floor</span>
              <strong>{room.floor || "-"}</strong>
            </div>
            <div>
              <span>Guest</span>
              <strong>{room.guestName || "Vacant"}</strong>
            </div>
          </div>

          {room.arrivalDate ? (
            <p className="room-meta">
              Check-in: {formatDate(room.arrivalDate)} | Check-out: {formatDate(room.departureDate)}
            </p>
          ) : (
            <p className="room-meta">Ready for next arrival</p>
          )}
        </article>
      ))}
    </div>
  );
}
