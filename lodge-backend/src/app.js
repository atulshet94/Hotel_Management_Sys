const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const roomRoutes = require("./routes/roomRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();
const frontendDistPath = path.resolve(__dirname, "../../lodge-frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        env.corsOrigins.length === 0 ||
        env.corsOrigins.includes("*") ||
        env.corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      const corsError = new Error("Origin not allowed by CORS.");
      corsError.status = 403;
      callback(corsError);
    },
  }),
);

app.use(express.json({ limit: "8mb" }));

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
}

app.get("/", (_req, res) => {
  if (hasFrontendBuild) {
    res.sendFile(frontendIndexPath);
    return;
  }

  res.json({
    name: "Sanman Lodge API",
    status: "online",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use(authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/settings", settingsRoutes);

if (hasFrontendBuild) {
  app.get(/^(?!\/api(?:\/|$))(?!\/login(?:\/|$))(?!\/health(?:\/|$)).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

app.use(errorHandler);

module.exports = app;
