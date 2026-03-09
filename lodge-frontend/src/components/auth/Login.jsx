import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage, loginRequest } from "../../services/api";
import { getSession, saveSession } from "../../services/session";
import "../../styles/login.css";

const LOCK_STORAGE_KEY = "sanman-login-lock-until";
const INACTIVITY_LIMIT_MS = 60_000;

function getDashboardPath(role) {
  return role === "owner" ? "/owner-dashboard" : "/employee-dashboard";
}

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.role) {
      navigate(getDashboardPath(session.role), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const storedLockUntil = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!storedLockUntil) {
      return;
    }

    const lockUntil = Number(storedLockUntil);
    if (Number.isNaN(lockUntil)) {
      localStorage.removeItem(LOCK_STORAGE_KEY);
      return;
    }

    const remainingSeconds = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
    if (remainingSeconds > 0) {
      setIsLocked(true);
      setShowForm(true);
      setLockRemaining(remainingSeconds);
      setError("Account locked. Wait for the countdown to finish.");
      return;
    }

    localStorage.removeItem(LOCK_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let timerId;

    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        setShowForm(false);
        setPassword("");
        setError("");
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timerId);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, []);

  useEffect(() => {
    const handleKeyReveal = () => {
      setShowForm((current) => current || true);
    };

    window.addEventListener("keydown", handleKeyReveal);
    return () => window.removeEventListener("keydown", handleKeyReveal);
  }, []);

  useEffect(() => {
    if (!isLocked || lockRemaining == null) {
      return undefined;
    }

    if (lockRemaining <= 0) {
      setIsLocked(false);
      setLockRemaining(null);
      setError("");
      localStorage.removeItem(LOCK_STORAGE_KEY);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setLockRemaining((current) => (current == null ? null : current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isLocked, lockRemaining]);

  async function handleLogin() {
    if (isLocked || !password.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const response = await loginRequest(password.trim());
      localStorage.removeItem(LOCK_STORAGE_KEY);
      saveSession(response.role);
      navigate(getDashboardPath(response.role), { replace: true });
    } catch (requestError) {
      const { response } = requestError;

      if (response?.status === 403 && response.data?.lockUntil) {
        const lockUntil = Number(response.data.lockUntil);
        const remainingSeconds = Math.max(
          0,
          Math.ceil((lockUntil - Number(response.data.now || Date.now())) / 1000),
        );
        localStorage.setItem(LOCK_STORAGE_KEY, String(lockUntil));
        setIsLocked(true);
        setLockRemaining(remainingSeconds);
        setPassword("");
        setError(response.data.msg);
        return;
      }

      if (response?.status === 429) {
        const lockUntil = Date.now() + 15 * 60 * 1000;
        localStorage.setItem(LOCK_STORAGE_KEY, String(lockUntil));
        setIsLocked(true);
        setLockRemaining(15 * 60);
        setPassword("");
        setError(response.data.msg);
        return;
      }

      setPassword("");
      setError(getErrorMessage(requestError, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReveal() {
    if (!showForm) {
      setShowForm(true);
    }
  }

  return (
    <div className="login-page" onClick={handleReveal}>
      <div className={`login-shell ${showForm ? "login-shell--open" : ""}`}>
        <div className="login-brand">
          <img src="/sanman-lodge-mark.svg" alt="Sanman Lodge logo" className="login-brand-mark" />
          <p className="login-overline">Hotel Operations Suite</p>
          <h1 className="login-title">Sanman Lodge</h1>
          <p className="login-subtitle">
            Front desk, room allocation, guest records, and billing in one secure workspace.
          </p>
        </div>

        {!showForm && (
          <button type="button" className="login-reveal" onClick={handleReveal}>
            Click anywhere or press any key to continue
          </button>
        )}

        {showForm && (
          <div className="login-card" onClick={(event) => event.stopPropagation()}>
            <div className="login-card__header">
              <h2>Secure Sign-In</h2>
              <p>Enter the owner or employee password to continue.</p>
            </div>

            <div className={`login-input-wrapper ${isLocked ? "login-input-wrapper--locked" : ""}`}>
              <input
                type={showPassword ? "text" : "password"}
                value={isLocked ? "" : password}
                onChange={(event) => {
                  if (!isLocked) {
                    setPassword(event.target.value);
                  }
                }}
                onKeyDown={(event) => {
                  if (isLocked) {
                    event.preventDefault();
                    return;
                  }

                  if (event.key === "Enter") {
                    handleLogin();
                  }
                }}
                className="login-input"
                placeholder={isLocked ? "Locked" : "Enter password"}
                autoComplete="off"
                readOnly={isLocked}
                disabled={isLocked}
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => !isLocked && setShowPassword((current) => !current)}
                disabled={isLocked}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="button"
              className="login-button"
              onClick={handleLogin}
              disabled={isLocked || isSubmitting || !password.trim()}
            >
              {isSubmitting ? "Checking..." : "Login"}
            </button>

            {isLocked && lockRemaining != null ? (
              <div className="login-message login-message--warning">
                <p>Too many incorrect attempts.</p>
                <p className="login-countdown" aria-live="polite">
                  Retry in {String(Math.floor(lockRemaining / 60)).padStart(2, "0")}:
                  {String(lockRemaining % 60).padStart(2, "0")}
                </p>
              </div>
            ) : null}

            {!isLocked && error ? <p className="login-message login-message--error">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
