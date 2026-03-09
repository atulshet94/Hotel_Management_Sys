const SESSION_KEY = "sanman-lodge-session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function parseSession(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed?.role || !parsed?.loginAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(role) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      role,
      loginAt: Date.now(),
    }),
  );
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const session = parseSession(sessionStorage.getItem(SESSION_KEY));
  if (!session) {
    clearSession();
    return null;
  }

  if (Date.now() - Number(session.loginAt) > SESSION_TTL_MS) {
    clearSession();
    return null;
  }

  return session;
}
