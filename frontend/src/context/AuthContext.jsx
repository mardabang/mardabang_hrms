import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const normalizeRole = (value) => {
  if (!value) return "ADMIN";
  const role = String(value).toUpperCase();
  const clean = role.startsWith("ROLE_") ? role.replace("ROLE_", "") : role;
  if (clean === "INPUTER") return "SUPERVISOR";
  return clean;
};

const normalizeUserData = (data = {}) => {
  const role = normalizeRole(data.role || data.userRole || data.authorities?.[0]);
  const username = data.username || data.email || data.userName || "user";

  return {
    id: data.userId || data.id,
    email: data.email || data.username || data.userName,
    username,
    fullName: data.fullName || data.name || username,
    role,
    firms: data.firms || data.company || [],
    token: data.token || data.accessToken,
    employeeCode: data.employeeCode || null,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("hrms_user");
    return raw ? JSON.parse(raw) : null;
  });

  const persistSession = useCallback((data) => {
    localStorage.setItem("hrms_token", data.token || "");
    localStorage.setItem("hrms_user", JSON.stringify(data));
    localStorage.setItem("hrms-role", data.role);
    localStorage.setItem("hrms-user", data.fullName || data.username);
    localStorage.setItem("isAuthenticated", "true");
    setUser(data);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", {
      email,
      password,
    });

    const data = normalizeUserData(res.data);
    persistSession(data);
    return data;
  }, [persistSession]);

  // Step 1 of OTP login: send a code to the given mobile number.
  // Supervisor and Employee accounts only — no password involved.
  const requestOtp = useCallback(async (mobile) => {
    const res = await api.post("/auth/otp/request", { mobile });
    return res.data;
  }, []);

  // Step 2 of OTP login: verify the code and complete sign-in.
  const verifyOtp = useCallback(async (mobile, code) => {
    const res = await api.post("/auth/otp/verify", { mobile, code });
    const data = normalizeUserData(res.data);
    persistSession(data);
    return data;
  }, [persistSession]);

  // Admin-only password recovery. Always resolves quietly (the backend
  // never reveals whether the email exists or belongs to an Admin account).
  const forgotPassword = useCallback(async (email) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    const res = await api.post("/auth/reset-password", { token, newPassword });
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_user");
    localStorage.removeItem("hrms-role");
    localStorage.removeItem("hrms-user");
    localStorage.removeItem("isAuthenticated");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{ user, login, requestOtp, verifyOtp, forgotPassword, resetPassword, logout, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
