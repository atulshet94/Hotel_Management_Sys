import { Navigate, useRoutes } from "react-router-dom";
import Login from "./components/auth/Login";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import EmployeeDashboard from "./features/employee/EmployeeDashboard";
import OwnerDashboard from "./features/owner/OwnerDashboard";

function App() {
  const routes = useRoutes([
    { path: "/", element: <Login /> },
    {
      path: "/employee-dashboard",
      element: (
        <ProtectedRoute roles={["employee"]}>
          <EmployeeDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/owner-dashboard",
      element: (
        <ProtectedRoute roles={["owner"]}>
          <OwnerDashboard />
        </ProtectedRoute>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);

  return routes;
}

export default App;
