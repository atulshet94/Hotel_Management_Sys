import axios from "axios";

const DEFAULT_API_URL = "https://hotelmanagementsys-production.up.railway.app";
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).trim().replace(/\/+$/, "");
const API_TARGET_LABEL = API_BASE_URL || "the current site";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

export function loginRequest(password) {
  return api.post("/login", { password }).then((response) => response.data);
}

export function fetchDashboardSummary() {
  return api.get("/api/dashboard/summary").then((response) => response.data);
}

export function fetchRooms() {
  return api.get("/api/rooms").then((response) => response.data);
}

export function fetchBookings(status) {
  return api.get("/api/bookings", { params: status ? { status } : undefined }).then((response) => response.data);
}

export function fetchSettings() {
  return api.get("/api/settings").then((response) => response.data);
}

export function updateSettings(payload) {
  return api.put("/api/settings", payload).then((response) => response.data);
}

export function createBooking(payload) {
  return api.post("/api/bookings", payload).then((response) => response.data);
}

export function checkoutBooking(bookingId) {
  return api.patch(`/api/bookings/${bookingId}/checkout`).then((response) => response.data);
}

export function getErrorMessage(error, fallback = "Something went wrong") {
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return `Cannot connect to ${API_TARGET_LABEL}. Verify the backend service is running and reachable.`;
  }

  return error?.response?.data?.msg || error?.response?.data?.message || error?.message || fallback;
}

export default api;
