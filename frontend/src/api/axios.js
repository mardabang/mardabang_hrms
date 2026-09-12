import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});


// Attach the JWT to every request once the user is logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hrms_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is invalid/expired, boot back to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("hrms_token");
      localStorage.removeItem("hrms_user");
      localStorage.removeItem("hrms-role");
      localStorage.removeItem("hrms-user");
      localStorage.removeItem("isAuthenticated");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
