// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ isAuthenticated, user, allowedRoles, children }) => {
  if (!isAuthenticated || !user) {
    // No auth or no user object → redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check if user has tenant_id (safety check)
  if (!user.tenant_id) {
    console.error("Missing tenant_id in user object");
    return <Navigate to="/login" replace />;
  }

  // Check allowedRoles
  if (!allowedRoles.includes(user.role)) {
    const fallbackPath =
      user.role === "admin"
        ? "/"
        : user.role === "cashier"
        ? "/gst-invoice"
        : "/gst-invoice";

    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
