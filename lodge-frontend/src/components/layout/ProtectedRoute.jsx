import { Navigate } from "react-router-dom";
import { getSession } from "../../services/session";

function getDashboardPath(role) {
  return role === "owner" ? "/owner-dashboard" : "/employee-dashboard";
}

export default function ProtectedRoute({ children, roles }) {
  const session = getSession();

  if (!session?.role) {
    return <Navigate to="/" replace />;
  }

  if (roles?.length && !roles.includes(session.role)) {
    return <Navigate to={getDashboardPath(session.role)} replace />;
  }

  return children;
}
