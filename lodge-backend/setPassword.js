const bcrypt = require("bcrypt");
const db = require("./src/config/db");
const env = require("./src/config/env");

async function main() {
  const ownerHash = await bcrypt.hash(env.defaultOwnerPassword, 12);
  const employeeHash = await bcrypt.hash(env.defaultEmployeePassword, 12);

  await db.query(
    "INSERT INTO users (role, passwordHash) VALUES ('owner', ?) ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)",
    [ownerHash],
  );

  await db.query(
    "INSERT INTO users (role, passwordHash) VALUES ('employee', ?) ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)",
    [employeeHash],
  );

  console.log("Default owner and employee passwords were updated successfully.");
  await db.end();
}

main().catch(async (error) => {
  console.error("Could not set passwords:", error.message);
  await db.end();
  process.exit(1);
});
