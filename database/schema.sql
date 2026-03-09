CREATE DATABASE IF NOT EXISTS sanmanlodge;
USE sanmanlodge;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role ENUM('owner', 'employee') NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  failedAttempts INT NOT NULL DEFAULT 0,
  lockUntil DATETIME NULL,
  lockCycle INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @has_users_created_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'created_at'
);

SET @add_users_created_at_sql := IF(
  @has_users_created_at = 0,
  'ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER lockCycle',
  'SELECT 1'
);

PREPARE add_users_created_at_stmt FROM @add_users_created_at_sql;
EXECUTE add_users_created_at_stmt;
DEALLOCATE PREPARE add_users_created_at_stmt;

SET @has_users_updated_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'updated_at'
);

SET @add_users_updated_at_sql := IF(
  @has_users_updated_at = 0,
  'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);

PREPARE add_users_updated_at_stmt FROM @add_users_updated_at_sql;
EXECUTE add_users_updated_at_stmt;
DEALLOCATE PREPARE add_users_updated_at_stmt;

DELETE u1
FROM users u1
INNER JOIN users u2
  ON u1.role = u2.role
 AND u1.id > u2.id;

ALTER TABLE users
  MODIFY role ENUM('owner','employee') NOT NULL,
  MODIFY passwordHash VARCHAR(255) NOT NULL,
  MODIFY failedAttempts INT NOT NULL DEFAULT 0,
  MODIFY lockCycle INT NOT NULL DEFAULT 0;

SET @has_users_role_unique := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'users_role_unique'
);

SET @add_users_role_unique_sql := IF(
  @has_users_role_unique = 0,
  'ALTER TABLE users ADD CONSTRAINT users_role_unique UNIQUE (role)',
  'SELECT 1'
);

PREPARE add_users_role_unique_stmt FROM @add_users_role_unique_sql;
EXECUTE add_users_role_unique_stmt;
DEALLOCATE PREPARE add_users_role_unique_stmt;

CREATE TABLE IF NOT EXISTS rooms (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  room_type VARCHAR(40) NOT NULL,
  floor_label VARCHAR(40) NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  status ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(40) NOT NULL UNIQUE,
  room_id INT NOT NULL,
  guest_name VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(160) NULL,
  address TEXT NULL,
  id_type VARCHAR(60) NOT NULL,
  id_number VARCHAR(100) NOT NULL,
  nationality VARCHAR(80) NOT NULL DEFAULT 'Indian',
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  nights INT NOT NULL,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  special_requests TEXT NULL,
  advance_payment DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_per_day DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
  gst_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2) NOT NULL,
  id_photo LONGTEXT NULL,
  guest_photo LONGTEXT NULL,
  status ENUM('checked_in', 'checked_out') NOT NULL DEFAULT 'checked_in',
  checkin_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checkout_time DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id)
);

SET @has_gst_percentage := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'gst_percentage'
);

SET @add_gst_column_sql := IF(
  @has_gst_percentage = 0,
  'ALTER TABLE bookings ADD COLUMN gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 18.00 AFTER total_amount',
  'SELECT 1'
);

PREPARE add_gst_column_stmt FROM @add_gst_column_sql;
EXECUTE add_gst_column_stmt;
DEALLOCATE PREPARE add_gst_column_stmt;

SET @has_settings_gst_number := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'system_settings'
    AND COLUMN_NAME = 'gst_number'
);

SET @add_settings_gst_number_sql := IF(
  @has_settings_gst_number = 0,
  'ALTER TABLE system_settings ADD COLUMN gst_number VARCHAR(30) NULL AFTER gst_percentage',
  'SELECT 1'
);

PREPARE add_settings_gst_number_stmt FROM @add_settings_gst_number_sql;
EXECUTE add_settings_gst_number_stmt;
DEALLOCATE PREPARE add_settings_gst_number_stmt;

INSERT INTO rooms (room_number, room_type, floor_label, price_per_day, status) VALUES
  ('101', 'Standard', 'First Floor', 1500, 'available'),
  ('102', 'Standard', 'First Floor', 1500, 'available'),
  ('103', 'Deluxe', 'First Floor', 2300, 'available'),
  ('104', 'Deluxe', 'First Floor', 2300, 'available'),
  ('201', 'Deluxe', 'Second Floor', 2600, 'available'),
  ('202', 'Deluxe', 'Second Floor', 2600, 'available'),
  ('203', 'Suite', 'Second Floor', 4200, 'available'),
  ('204', 'Suite', 'Second Floor', 4200, 'maintenance')
ON DUPLICATE KEY UPDATE
  room_type = VALUES(room_type),
  floor_label = VALUES(floor_label),
  price_per_day = VALUES(price_per_day),
  status = VALUES(status);

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
) VALUES (
  1,
  'Sanman Lodge',
  'http://localhost:3000',
  18.00,
  '',
  'SNL',
  '',
  '',
  'Thank you for choosing Sanman Lodge.'
)
ON DUPLICATE KEY UPDATE
  lodge_name = VALUES(lodge_name),
  local_access_url = VALUES(local_access_url),
  gst_percentage = VALUES(gst_percentage),
  gst_number = VALUES(gst_number),
  bill_prefix = VALUES(bill_prefix),
  support_phone = VALUES(support_phone),
  support_email = VALUES(support_email),
  bill_footer = VALUES(bill_footer);
