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

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

module.exports = {
  port: asNumber(process.env.PORT, 5000),
  corsOrigins: asArray(process.env.CORS_ORIGIN, ""),
  db: {
    host: firstDefined(process.env.DB_HOST, process.env.MYSQLHOST, "localhost"),
    port: asNumber(firstDefined(process.env.DB_PORT, process.env.MYSQLPORT), 3306),
    user: firstDefined(process.env.DB_USER, process.env.MYSQLUSER, "root"),
    password: firstDefined(process.env.DB_PASSWORD, process.env.MYSQLPASSWORD, "AtulShet$123"),
    database: firstDefined(process.env.DB_NAME, process.env.MYSQLDATABASE, "sanmanlodge"),
  },
  defaultOwnerPassword: process.env.DEFAULT_OWNER_PASSWORD || "Owner@123",
  defaultEmployeePassword: process.env.DEFAULT_EMPLOYEE_PASSWORD || "Emp@123",
};
