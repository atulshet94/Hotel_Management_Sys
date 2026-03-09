import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CheckIn from "./CheckIn";
import CheckOut from "./CheckOut";
import GenerateBill from "./GenerateBill";
import GuestDatabase from "./GuestDatabase";
import RoomAvailability from "./RoomAvailability";
import {
  checkoutBooking,
  createBooking,
  fetchBookings,
  fetchDashboardSummary,
  fetchRooms,
  fetchSettings,
  getErrorMessage,
} from "../../services/api";
import { clearSession } from "../../services/session";
import { DEFAULT_SYSTEM_SETTINGS } from "../../utils/hotel";
import "../../styles/dashboard.css";

const tabs = [
  { id: "checkin", label: "New Check-In" },
  { id: "checkout", label: "Check-Out" },
  { id: "billing", label: "Generate Bill" },
  { id: "rooms", label: "Room Status" },
  { id: "guests", label: "Guest Database" },
];

const emptySummary = {
  activeGuests: 0,
  occupiedRooms: 0,
  availableRooms: 0,
  totalRooms: 0,
  totalBookings: 0,
  todayRevenue: 0,
  occupancyRate: 0,
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("checkin");
  const [summary, setSummary] = useState(emptySummary);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
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
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Could not load hotel data. Start the backend and check MySQL."),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBooking(payload) {
    try {
      setBusyAction("create-booking");
      const createdBooking = await createBooking(payload);
      setNotice({
        type: "success",
        message: `Guest checked in successfully. Booking ${createdBooking.bookingCode} is now active.`,
      });
      await loadDashboardData();
      setActiveTab("checkout");
    } catch (error) {
      const message = getErrorMessage(error, "Could not complete the guest check-in.");
      setNotice({ type: "error", message });
      throw new Error(message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleCheckout(bookingId) {
    try {
      setBusyAction(`checkout-${bookingId}`);
      const checkedOutBooking = await checkoutBooking(bookingId);
      setNotice({
        type: "success",
        message: `Guest ${checkedOutBooking.guestName} has been checked out successfully.`,
      });
      await loadDashboardData();
      setActiveTab("billing");
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, "Could not complete check-out."),
      });
    } finally {
      setBusyAction("");
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  function renderActiveTab() {
    if (loading) {
      return <div className="panel-placeholder">Loading employee dashboard...</div>;
    }

    switch (activeTab) {
      case "checkin":
        return (
          <CheckIn
            rooms={rooms}
            settings={settings}
            submitting={busyAction === "create-booking"}
            onSubmit={handleCreateBooking}
          />
        );
      case "checkout":
        return (
          <CheckOut
            bookings={bookings.filter((booking) => booking.status === "checked_in")}
            busyBookingId={busyAction.startsWith("checkout-") ? Number(busyAction.replace("checkout-", "")) : null}
            onCheckout={handleCheckout}
          />
        );
      case "billing":
        return <GenerateBill bookings={bookings} settings={settings} />;
      case "rooms":
        return <RoomAvailability rooms={rooms} />;
      case "guests":
        return <GuestDatabase bookings={bookings} />;
      default:
        return null;
    }
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="brand-stack">
          <img src="/sanman-lodge-mark.svg" alt="Sanman Lodge logo" className="brand-mark" />
          <div>
            <p className="eyebrow">Employee Console</p>
            <h1>{settings.lodgeName} Front Desk</h1>
            <p className="header-copy">
              Manage arrivals, departures, room allocation, guest records, and invoices from one screen.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="button button--ghost" onClick={loadDashboardData}>
            Refresh
          </button>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">In-House Guests</span>
          <strong>{summary.activeGuests}</strong>
          <p>Currently checked in</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Occupied Rooms</span>
          <strong>{summary.occupiedRooms}</strong>
          <p>{summary.availableRooms} rooms still available</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Occupancy</span>
          <strong>{summary.occupancyRate}%</strong>
          <p>{summary.totalRooms} total rooms</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Today's Revenue</span>
          <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(summary.todayRevenue)}</strong>
          <p>{summary.totalBookings} bookings recorded</p>
        </article>
      </section>

      <nav className="tab-strip" aria-label="Employee modules">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? "tab-button--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {notice ? <div className={`feedback-banner feedback-banner--${notice.type}`}>{notice.message}</div> : null}

      <section className="module-panel">{renderActiveTab()}</section>
    </div>
  );
}
