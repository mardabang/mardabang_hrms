import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const normalizeRole = (value) => {
  if (!value) return "ADMIN";

  const role = String(value).toUpperCase();
  const clean = role.startsWith("ROLE_")
    ? role.replace("ROLE_", "")
    : role;

  // Backend still uses INPUTER.
  // Frontend displays it as Supervisor.
  if (clean === "INPUTER") return "SUPERVISOR";

  return clean;
};

const normalizeUserData = (data = {}) => {
  const role = normalizeRole(
    data.role || data.userRole || data.authorities?.[0]
  );

  const username =
    data.loginId ||
    data.username ||
    data.email ||
    data.userName ||
    "user";

  return {
    id: data.userId || data.id,
    loginId: data.loginId || data.username || data.email,
    email: data.email || null,
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
    localStorage.setItem("hrms-role", data.role || "");
    localStorage.setItem(
      "hrms-user",
      data.fullName || data.username || data.loginId || ""
    );
    localStorage.setItem("isAuthenticated", "true");

    setUser(data);
  }, []);

  // Common login for Admin, Supervisor and Employee
  const login = useCallback(
    async (loginId, password) => {
      const res = await api.post("/auth/login", {
        loginId,
        password,
      });

      const data = normalizeUserData(res.data);

      persistSession(data);

      return data;
    },
    [persistSession]
  );

  // Email based password recovery for ALL roles
  const forgotPassword = useCallback(async (email) => {
    const res = await api.post("/auth/forgot-password", {
      email,
    });

    return res.data;
  }, []);

  // Reset password using email link token
  const resetPassword = useCallback(async (token, newPassword) => {
    const res = await api.post("/auth/reset-password", {
      token,
      newPassword,
    });

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
      value={{
        user,
        login,
        forgotPassword,
        resetPassword,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
}