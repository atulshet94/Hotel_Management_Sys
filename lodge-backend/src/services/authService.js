const bcrypt = require("bcrypt");
const db = require("../config/db");
const createHttpError = require("../utils/httpError");

const loginAttempts = new Map();
const MAX_IP_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const FIRST_LOCK_AFTER = 6;
const NEXT_CYCLE_ATTEMPTS = 4;
const FIRST_LOCK_MINUTES = 1;
const LOCK_INCREMENT_MINUTES = 1.5;

function normalizeUser(row) {
  return {
    ...row,
    failedAttempts: Number(row.failedAttempts || 0),
    lockCycle: Number(row.lockCycle || 0),
    lockUntil: row.lockUntil ? new Date(row.lockUntil) : null,
  };
}

function getIpAttemptRecord(ip) {
  const now = Date.now();
  const current = loginAttempts.get(ip);

  if (!current || current.resetTime <= now) {
    const nextRecord = { count: 0, resetTime: now + WINDOW_MS };
    loginAttempts.set(ip, nextRecord);
    return nextRecord;
  }

  return current;
}

function buildLockDetails(lockUntil, now) {
  return {
    details: {
      lockUntil: lockUntil.getTime(),
      now: now.getTime(),
    },
  };
}

async function resetUserLock(userId) {
  await db.query("UPDATE users SET failedAttempts = 0, lockUntil = NULL, lockCycle = 0 WHERE id = ?", [userId]);
}

async function recordFailedAttempt(user, now) {
  const failedAttempts = user.failedAttempts + 1;
  const cycle = user.lockCycle || 0;
  let nextLockCycle = cycle;
  let lockUntil = null;
  let lockMinutes = 0;

  if (cycle === 0) {
    if (failedAttempts >= FIRST_LOCK_AFTER) {
      lockMinutes = FIRST_LOCK_MINUTES;
      lockUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
      nextLockCycle = 1;
    }
  } else if (failedAttempts >= NEXT_CYCLE_ATTEMPTS) {
    lockMinutes = 2.5 + (cycle - 1) * LOCK_INCREMENT_MINUTES;
    lockUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    nextLockCycle = cycle + 1;
  }

  await db.query(
    "UPDATE users SET failedAttempts = ?, lockUntil = ?, lockCycle = ? WHERE id = ?",
    [failedAttempts, lockUntil, nextLockCycle, user.id],
  );

  return {
    failedAttempts,
    lockUntil,
    lockMinutes,
    cycle,
  };
}

async function fetchUsers() {
  const [rows] = await db.query(
    "SELECT id, role, passwordHash, failedAttempts, lockUntil, lockCycle FROM users ORDER BY FIELD(role, 'owner', 'employee'), id",
  );

  return rows.map(normalizeUser);
}

function selectUserForFailedAttempt(users, now) {
  const unlockedUser = users.find((user) => !user.lockUntil || user.lockUntil <= now);
  return unlockedUser || users[0];
}

async function loginWithPassword(password, ip) {
  if (!password || password.length < 4) {
    throw createHttpError(400, "Password required");
  }

  const now = new Date();
  const ipRecord = getIpAttemptRecord(ip);
  if (ipRecord.count >= MAX_IP_ATTEMPTS) {
    throw createHttpError(429, "Too many login attempts from this IP. Try again in 15 minutes.");
  }

  const users = await fetchUsers();
  if (!users.length) {
    throw createHttpError(500, "No user configured. Run the schema and password setup first.");
  }

  let matchedUser = null;

  for (const candidate of users) {
    const passwordMatches = await bcrypt.compare(password, candidate.passwordHash);
    if (passwordMatches) {
      matchedUser = candidate;
      break;
    }
  }

  if (matchedUser) {
    if (matchedUser.lockUntil && matchedUser.lockUntil <= now) {
      await resetUserLock(matchedUser.id);
      matchedUser.lockUntil = null;
      matchedUser.failedAttempts = 0;
      matchedUser.lockCycle = 0;
    }

    if (matchedUser.lockUntil && matchedUser.lockUntil > now) {
      throw createHttpError(
        403,
        `Account locked. Wait ${Math.ceil((matchedUser.lockUntil.getTime() - now.getTime()) / 1000)} seconds.`,
        buildLockDetails(matchedUser.lockUntil, now),
      );
    }

    await resetUserLock(matchedUser.id);
    loginAttempts.delete(ip);

    return { role: matchedUser.role };
  }

  const targetUser = selectUserForFailedAttempt(users, now);
  if (targetUser.lockUntil && targetUser.lockUntil > now) {
    throw createHttpError(
      403,
      `Account locked. Wait ${Math.ceil((targetUser.lockUntil.getTime() - now.getTime()) / 1000)} seconds.`,
      buildLockDetails(targetUser.lockUntil, now),
    );
  }

  const failedResult = await recordFailedAttempt(targetUser, now);
  ipRecord.count += 1;

  if (failedResult.lockMinutes > 0 && failedResult.lockUntil) {
    throw createHttpError(
      403,
      `Account locked for ${failedResult.lockMinutes} minute${failedResult.lockMinutes !== 1 ? "s" : ""}.`,
      buildLockDetails(failedResult.lockUntil, now),
    );
  }

  const attemptsLeft =
    failedResult.cycle === 0
      ? Math.max(0, FIRST_LOCK_AFTER - failedResult.failedAttempts)
      : Math.max(0, NEXT_CYCLE_ATTEMPTS - failedResult.failedAttempts);

  throw createHttpError(401, `Wrong password. Attempts left before lock: ${attemptsLeft}`, {
    details: { attemptsLeft },
  });
}

module.exports = {
  loginWithPassword,
};
