import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap routes that require login.
 * - Pass adminOnly to gate on ADMIN role only (legacy behavior).
 * - Pass allowedRoles={["ADMIN","SUPERVISOR"]} etc. for an explicit role allow-list.
 */
export default function ProtectedRoute({ adminOnly = false, allowedRoles }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Employees are always confined to /employee/**
  if (user.role === "EMPLOYEE" && pathname !== "/" && !pathname.startsWith("/employee/") && pathname !== "/employee") {
    return <Navigate to={pathname === "/profile" ? "/employee/profile" : "/employee/dashboard"} replace />;
  }

  // Legacy strict admin-only gate
  if (adminOnly && user.role !== "ADMIN") {
    return <Navigate to={user.role === "EMPLOYEE" ? "/employee/dashboard" : "/supervisor-dashboard"} replace />;
  }

  // Explicit role allow-list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === "ADMIN" ? "/dashboard" : user.role === "EMPLOYEE" ? "/employee/dashboard" : "/supervisor-dashboard";
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}