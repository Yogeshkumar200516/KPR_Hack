import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // ✅ Correct named import
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const decoded = jwtDecode(token); // ✅ Correct usage
        const currentTime = Date.now() / 1000; // Current time in seconds

        if (decoded.exp < currentTime) {
          // Token expired → logout
          handleLogout();
        } else {
          const parsedUser = JSON.parse(userData);

          // ✅ Ensure tenant_id and role are explicitly stored in context
          setUser({
            ...parsedUser,
            tenant_id: decoded.tenant_id,
            role: parsedUser.role, // role can be super_admin, admin, cashier, sales
          });

          // Auto logout timer
          const timeUntilExpiry = (decoded.exp - currentTime) * 1000;
          const timer = setTimeout(() => handleLogout(), timeUntilExpiry);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Token decode error:", error);
        handleLogout();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("tenantId");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
