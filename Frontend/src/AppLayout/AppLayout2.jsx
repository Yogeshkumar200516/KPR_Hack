import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

import Navbar from "../components/Navbar/Navbar";
import GstInvoice from "../pages/GSTInvoice/GstInvoice";
import Products from "../pages/Products/Products";
import PartyMaster from "../pages/PartyMaster/PartyMaster";
import Dashboard from "../pages/Dashboard/GSTReport";
import AddUsers from "../pages/AddUsers/AddUsers";
import LoginPage from "../components/Login/Login";
import Loader from "../components/Loader/Loader";
import AddAdmin from "../pages/SuperAdmin/AddAdmin/AddAdmin";
import AddSuperAdmin from "../pages/SuperAdmin/AddSuperAdmin/AddSuperAdmin";
import AddCompany from "../pages/SuperAdmin/AddCompanies/AddCompanies";
import LoadingPage from "../components/LoginLoader.jsx/LoginLoader";
import ReturnStock from "../pages/ReturnStock/ReturnStock";


const AppLayout = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const navigate = useNavigate();

  // 📱 Responsive layout breakpoints
  const isXLarge = useMediaQuery("(min-width:1200px)");
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:600px) and (max-width:1200px)");

  // 📁 Sidebar drawer state
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState("permanent");

  // 📁 Handle responsive drawer setup on screen resize
  useEffect(() => {
    if (isSmall) {
      setVariant("temporary");
      setOpen(false);
    } else if (isXLarge) {
      setVariant("permanent");
      setOpen(true);
    } else if (isMedium) {
      setVariant("permanent");
      setOpen(false);
    }
  }, [isXLarge, isMedium, isSmall]);

  // ✅ Drawer toggle handler
  const handleDrawerToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // 🟢 Login & Auth check on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  // 🕒 Auto logout after 20 hours
  useEffect(() => {
    let logoutTimer;

    if (isAuthenticated) {
      logoutTimer = setTimeout(() => {
        console.log("🔒 Auto-logout triggered");
        handleLogout();
      }, 20 * 60 * 60 * 1000); // 20 hours
    }

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [isAuthenticated]);

  // 🟢 Handle login
  const handleLogin = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", token);
    setUser(userData);
    setIsAuthenticated(true);

    // Show loading for 3 seconds
    setShowLoading(true);

    // Reset drawer after login
    if (isXLarge) {
      setVariant("permanent");
      setOpen(true);
    } else {
      setVariant("temporary");
      setOpen(false);
    }

    // Remove direct navigation here, will navigate after loading
  };

  // 🔴 Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthenticated(false);
    setOpen(false); // Reset drawer explicitly
    navigate("/login", { replace: true });
  };

  // 🛡️ Protected route component
  const PrivateRoute = ({ element: Element, roles }) => {
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (!roles.includes(user?.role)) {
      const defaultPath =
        user?.role === "super_admin"
          ? "/super-admin"
          : user?.role === "admin"
          ? "/"
          : user?.role === "cashier"
          ? "/gst-invoice"
          : user?.role === "sales"
          ? "/products"
          : "/login";
      return <Navigate to={defaultPath} replace />;
    }
    return <Element />;
  };

  // Callback when LoadingPage finishes
  const onLoadingComplete = () => {
    setShowLoading(false);

    // Navigate based on role
    if (user?.role === "super_admin") navigate("/super-admin");
    else if (user?.role === "admin") navigate("/");
    else navigate("/gst-invoice");
  };

  if (loading) return <Loader />;

  // Show LoadingPage after login for 3 seconds
  if (showLoading) {
    return <LoadingPage onLoaded={onLoadingComplete} />;
  }

  let marginTop = variant === "temporary" ? 34 : 44;
  let marginLeft = 0;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {isAuthenticated && (
        <Navbar
          onLogout={handleLogout}
          user={user}
          open={open}
          variant={variant}
          setOpen={setOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: `${marginTop}px`,
          marginLeft: `${marginLeft}px`,
          px: { xs: 1, sm: 2 },
          pb: 2,
          display: "block",
          overflow: "auto",
        }}
      >
        <Routes>
          {/* Login route */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate
                  to={
                    user?.role === "super_admin"
                      ? "/add-company"
                      : user?.role === "admin"
                      ? "/"
                      : "/gst-invoice"
                  }
                  replace
                />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />

          {/* Super Admin routes */}
          <Route
            path="/add-company"
            element={
              <PrivateRoute element={AddCompany} roles={["super_admin"]} />
            }
          />
          <Route
            path="/add-admin"
            element={<PrivateRoute element={AddAdmin} roles={["super_admin"]} />}
          />
          <Route
            path="/add-superadmin"
            element={
              <PrivateRoute element={AddSuperAdmin} roles={["super_admin"]} />
            }
          />

          {/* Admin + Super Admin routes */}
          <Route
            path="/"
            element={<PrivateRoute element={Dashboard} roles={["admin"]} />}
          />
          <Route
            path="/add-users"
            element={<PrivateRoute element={AddUsers} roles={["admin"]} />}
          />

          {/* Common routes */}
          <Route
            path="/gst-invoice"
            element={
              <PrivateRoute element={GstInvoice} roles={["admin", "cashier", "sales"]} />
            }
          />
          <Route
            path="/products"
            element={<PrivateRoute element={Products} roles={["admin", "sales"]} />}
          />
          <Route
            path="/party-master"
            element={
              <PrivateRoute element={PartyMaster} roles={["admin", "cashier", "sales"]} />
            }
          />
          <Route
            path="/return-stock"
            element={
              <PrivateRoute element={ReturnStock} roles={["admin", "sales"]} />
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default AppLayout;
