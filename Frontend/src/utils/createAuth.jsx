import axios from "axios";
import API_BASE_URL from "../Context/Api";

export const createAuthAxios = () => {
  // 🔹 Get the latest auth token from localStorage
  const token = localStorage.getItem("authToken");

  // 🔹 Create an Axios instance with default settings
  const authAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // 🔹 Optional: Interceptor to handle token expiry or auth errors globally
  authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn("⚠️ Token expired or unauthorized — redirecting to login...");
        localStorage.removeItem("authToken");
        window.location.href = "/login"; // adjust if your route differs
      }
      return Promise.reject(error);
    }
  );

  return authAxios;
};
