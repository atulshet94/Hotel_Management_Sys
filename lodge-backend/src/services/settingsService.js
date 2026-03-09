const db = require("../config/db");
const createHttpError = require("../utils/httpError");

const defaultSettings = {
  id: 1,
  lodgeName: "Sanman Lodge",
  localAccessUrl: "http://localhost:3000",
  gstPercentage: 18,
  gstNumber: "",
  billPrefix: "SNL",
  supportPhone: "",
  supportEmail: "",
  billFooter: "Thank you for choosing Sanman Lodge.",
};

let settingsTableReady = false;

async function ensureSettingsTable(connection = db) {
  if (settingsTableReady) {
    return;
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INT NOT NULL PRIMARY KEY,
      lodge_name VARCHAR(120) NOT NULL,
      local_access_url VARCHAR(255) NOT NULL,
      gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
      gst_number VARCHAR(30) NULL,
      bill_prefix VARCHAR(12) NOT NULL DEFAULT 'SNL',
      support_phone VARCHAR(25) NULL,
      support_email VARCHAR(160) NULL,
      bill_footer VARCHAR(255) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columnRows] = await connection.query(`
    SELECT COUNT(*) AS column_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'system_settings'
      AND COLUMN_NAME = 'gst_number'
  `);

  if (!Number(columnRows[0]?.column_count || 0)) {
    await connection.query(`
      ALTER TABLE system_settings
      ADD COLUMN gst_number VARCHAR(30) NULL AFTER gst_percentage
    `);
  }

  settingsTableReady = true;
}

function normalizeSettings(row) {
  return {
    id: row.id,
    lodgeName: row.lodge_name,
    localAccessUrl: row.local_access_url,
    gstPercentage: Number(row.gst_percentage),
    gstNumber: row.gst_number || "",
    billPrefix: row.bill_prefix,
    supportPhone: row.support_phone || "",
    supportEmail: row.support_email || "",
    billFooter: row.bill_footer || "",
  };
}

async function ensureSettings(connection = db) {
  await ensureSettingsTable(connection);
  const [rows] = await connection.query("SELECT * FROM system_settings WHERE id = 1 LIMIT 1");
  if (rows.length) {
    const normalized = normalizeSettings(rows[0]);

    if (normalized.localAccessUrl === "http://sanmanlodge.localhost:3000") {
      await connection.query(
        "UPDATE system_settings SET local_access_url = ? WHERE id = 1",
        [defaultSettings.localAccessUrl],
      );
      return { ...normalized, localAccessUrl: defaultSettings.localAccessUrl };
    }

    return normalized;
  }

  await connection.query(
    `
      INSERT INTO system_settings (
        id,
        lodge_name,
        local_access_url,
        gst_percentage,
        gst_number,
        bill_prefix,
        support_phone,
        support_email,
        bill_footer
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      defaultSettings.lodgeName,
      defaultSettings.localAccessUrl,
      defaultSettings.gstPercentage,
      defaultSettings.gstNumber,
      defaultSettings.billPrefix,
      defaultSettings.supportPhone,
      defaultSettings.supportEmail,
      defaultSettings.billFooter,
    ],
  );

  return { ...defaultSettings };
}

async function getSettings(connection = db) {
  return ensureSettings(connection);
}

async function updateSettings(payload) {
  await ensureSettings();

  const lodgeName = String(payload.lodgeName || "").trim();
  const localAccessUrl = String(payload.localAccessUrl || "").trim();
  const gstPercentage = Number(payload.gstPercentage);
  const gstNumber = String(payload.gstNumber || "").trim().toUpperCase();
  const billPrefix = String(payload.billPrefix || "").trim().toUpperCase();
  const supportPhone = String(payload.supportPhone || "").trim();
  const supportEmail = String(payload.supportEmail || "").trim();
  const billFooter = String(payload.billFooter || "").trim();

  if (!lodgeName) {
    throw createHttpError(400, "Lodge name is required.");
  }

  if (!localAccessUrl) {
    throw createHttpError(400, "Local access URL is required.");
  }

  if (!Number.isFinite(gstPercentage) || gstPercentage < 0 || gstPercentage > 100) {
    throw createHttpError(400, "GST percentage must be between 0 and 100.");
  }

  if (!billPrefix || billPrefix.length > 12) {
    throw createHttpError(400, "Bill prefix is required and must be 12 characters or fewer.");
  }

  if (gstNumber.length > 30) {
    throw createHttpError(400, "GST number must be 30 characters or fewer.");
  }

  await db.query(
    `
      UPDATE system_settings
      SET
        lodge_name = ?,
        local_access_url = ?,
        gst_percentage = ?,
        gst_number = ?,
        bill_prefix = ?,
        support_phone = ?,
        support_email = ?,
        bill_footer = ?
      WHERE id = 1
    `,
    [lodgeName, localAccessUrl, gstPercentage, gstNumber, billPrefix, supportPhone, supportEmail, billFooter],
  );

  return getSettings();
}

module.exports = {
  defaultSettings,
  getSettings,
  updateSettings,
};
