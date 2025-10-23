import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ isAuthenticated, user, allowedRoles, children }) => {
  if (!isAuthenticated || !user) {
    // No auth or no user → redirect to login
    return <Navigate to="/login" replace />;
  }

  if (!user.tenant_id) {
    console.error("Missing tenant_id in user object");
    return <Navigate to="/login" replace />;
  }

  // ✅ Role-based access control
  if (!allowedRoles.includes(user.role)) {
    // Define fallbacks per role
    const fallbackPath =
      user.role === "super_admin"
        ? "/super-admin-dashboard"
        : user.role === "admin"
        ? "/"
        : user.role === "cashier"
        ? "/gst-invoice"
        : user.role === "sales"
        ? "/sales-dashboard"
        : "/login"; // unknown role → force login

    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
