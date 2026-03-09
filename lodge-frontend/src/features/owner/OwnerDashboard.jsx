import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchBookings,
  fetchDashboardSummary,
  fetchRooms,
  fetchSettings,
  getErrorMessage,
  updateSettings,
} from "../../services/api";
import { clearSession } from "../../services/session";
import { DEFAULT_SYSTEM_SETTINGS, formatCurrency, formatDate, getOutstandingBalance } from "../../utils/hotel";
import "../../styles/dashboard.css";

const emptySummary = {
  activeGuests: 0,
  occupiedRooms: 0,
  availableRooms: 0,
  totalRooms: 0,
  totalBookings: 0,
  todayRevenue: 0,
  occupancyRate: 0,
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(emptySummary);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadOwnerData() {
      try {
        const [summaryResponse, roomsResponse, bookingsResponse] = await Promise.all([
          fetchDashboardSummary(),
          fetchRooms(),
          fetchBookings(),
        ]);
        let settingsResponse = DEFAULT_SYSTEM_SETTINGS;

        try {
          settingsResponse = await fetchSettings();
        } catch {
          settingsResponse = DEFAULT_SYSTEM_SETTINGS;
        }

        setSummary({ ...emptySummary, ...summaryResponse });
        setRooms(roomsResponse);
        setBookings(bookingsResponse);
        setSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...settingsResponse });
        setSettingsForm({ ...DEFAULT_SYSTEM_SETTINGS, ...settingsResponse });
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Could not load owner dashboard data."));
      }
    }

    loadOwnerData();
  }, []);

  const totalRevenue = bookings.reduce((sum, booking) => sum + Number(booking.finalAmount || 0), 0);
  const totalGstCollected = bookings.reduce((sum, booking) => sum + Number(booking.gstAmount || 0), 0);
  const outstandingAmount = bookings
    .filter((booking) => booking.status === "checked_in")
    .reduce((sum, booking) => sum + getOutstandingBalance(booking), 0);
  const checkedOutBookings = bookings.filter((booking) => booking.status === "checked_out").length;
  const latestBookings = bookings.slice(0, 6);

  async function handleSaveSettings(event) {
    event.preventDefault();

    try {
      setSavingSettings(true);
      setError("");
      setNotice("");
      const savedSettings = await updateSettings(settingsForm);
      setSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...savedSettings });
      setSettingsForm({ ...DEFAULT_SYSTEM_SETTINGS, ...savedSettings });
      setNotice("Owner settings saved successfully.");
    } catch (requestError) {
      setNotice("");
      setError(getErrorMessage(requestError, "Could not save owner settings."));
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="brand-stack">
          <img src="/sanman-lodge-mark.svg" alt="Sanman Lodge logo" className="brand-mark" />
          <div>
            <p className="eyebrow">Owner Console</p>
            <h1>{settings.lodgeName} Overview</h1>
            <p className="header-copy">A read-only summary of occupancy, bookings, and current room utilization.</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              clearSession();
              navigate("/", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Revenue Today</span>
          <strong>{formatCurrency(summary.todayRevenue)}</strong>
          <p>Gross billed amount for today</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Total Revenue</span>
          <strong>{formatCurrency(totalRevenue)}</strong>
          <p>All recorded bookings</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">GST Collected</span>
          <strong>{formatCurrency(totalGstCollected)}</strong>
          <p>Tax included in all invoices</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Occupancy</span>
          <strong>{summary.occupancyRate}%</strong>
          <p>{summary.occupiedRooms} of {summary.totalRooms} rooms occupied</p>
        </article>
      </section>

      {error ? <div className="feedback-banner feedback-banner--error">{error}</div> : null}
      {notice ? <div className="feedback-banner feedback-banner--success">{notice}</div> : null}

      <div className="module-split">
        <div className="module-card module-card--compact">
          <div className="section-heading">
            <div>
              <p className="section-overline">Operations Snapshot</p>
              <h2>Business Overview</h2>
            </div>
          </div>
          <div className="detail-list detail-list--stacked">
            <div>
              <span>Active Guests</span>
              <strong>{summary.activeGuests}</strong>
            </div>
            <div>
              <span>Available Rooms</span>
              <strong>{summary.availableRooms}</strong>
            </div>
            <div>
              <span>Checked-Out Bookings</span>
              <strong>{checkedOutBookings}</strong>
            </div>
            <div>
              <span>Outstanding Balance</span>
              <strong>{formatCurrency(outstandingAmount)}</strong>
            </div>
          </div>
        </div>

        <div className="module-card module-card--compact">
          <div className="section-heading">
            <div>
              <p className="section-overline">Room Utilization</p>
              <h2>Occupancy Snapshot</h2>
            </div>
          </div>
          <div className="detail-list detail-list--stacked">
            {rooms.slice(0, 8).map((room) => (
              <div key={room.id}>
                <span>
                  Room {room.number} - {room.type}
                </span>
                <strong>{room.guestName ? `${room.guestName} until ${formatDate(room.departureDate)}` : "Available"}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="module-panel owner-section-gap">
        <form className="module-card" onSubmit={handleSaveSettings}>
          <div className="section-heading">
            <div>
              <p className="section-overline">Business Settings</p>
              <h2>Branding & Billing</h2>
            </div>
          </div>

          <div className="form-layout form-layout--two-column">
            <section className="form-section">
              <label>
                Lodge Name
                <input
                  value={settingsForm.lodgeName}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, lodgeName: event.target.value }))}
                />
              </label>
              <label>
                Local Access URL
                <input
                  value={settingsForm.localAccessUrl}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, localAccessUrl: event.target.value }))
                  }
                />
              </label>
              <label>
                GST Percentage
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settingsForm.gstPercentage}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, gstPercentage: event.target.value }))
                  }
                />
              </label>
              <label>
                GST Number
                <input
                  value={settingsForm.gstNumber}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, gstNumber: event.target.value.toUpperCase() }))
                  }
                />
              </label>
              <label>
                Bill Prefix
                <input
                  value={settingsForm.billPrefix}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, billPrefix: event.target.value }))}
                />
              </label>
            </section>

            <section className="form-section">
              <label>
                Support Phone
                <input
                  value={settingsForm.supportPhone}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, supportPhone: event.target.value }))
                  }
                />
              </label>
              <label>
                Support Email
                <input
                  value={settingsForm.supportEmail}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, supportEmail: event.target.value }))
                  }
                />
              </label>
              <label>
                Bill Footer
                <textarea
                  rows="4"
                  value={settingsForm.billFooter}
                  onChange={(event) =>
                    setSettingsForm((current) => ({ ...current, billFooter: event.target.value }))
                  }
                />
              </label>
            </section>
          </div>

          <div className="module-actions">
            <button type="submit" className="button button--primary" disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>

        <div className="module-card">
          <div className="section-heading">
            <div>
              <p className="section-overline">Recent Activity</p>
              <h2>Latest Bookings</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-In</th>
                  <th>Status</th>
                  <th>Final Amount</th>
                </tr>
              </thead>
              <tbody>
                {latestBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.bookingCode}</td>
                    <td>{booking.guestName}</td>
                    <td>
                      {booking.roomNumber} - {booking.roomType}
                    </td>
                    <td>{formatDate(booking.arrivalDate)}</td>
                    <td>
                      <span className={`status-pill status-pill--${booking.status}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{formatCurrency(booking.finalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
