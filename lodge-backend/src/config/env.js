const path = require("path");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value, fallback) {
  return (value || fallback || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

module.exports = {
  port: asNumber(process.env.PORT, 5000),
  corsOrigins: asArray(process.env.CORS_ORIGIN, ""),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: asNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sanmanlodge",
  },
  defaultOwnerPassword: process.env.DEFAULT_OWNER_PASSWORD || "Owner@123",
  defaultEmployeePassword: process.env.DEFAULT_EMPLOYEE_PASSWORD || "Emp@123",
};
