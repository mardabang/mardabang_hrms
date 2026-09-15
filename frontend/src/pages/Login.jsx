import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const routeForRole = (role) => {
  const value = (role || "").toUpperCase();

  if (value === "ADMIN") return "/dashboard";
  if (value === "EMPLOYEE") return "/employee/dashboard";

  // Frontend normalized INPUTER -> SUPERVISOR
  return "/supervisor-dashboard";
};

const errorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  fallback;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    loginId: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const userData = await login(
        form.loginId.trim(),
        form.password
      );

      navigate(routeForRole(userData.role), {
        replace: true,
      });
    } catch (err) {
      setError(
        errorMessage(
          err,
          "Invalid email/phone number or password."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <img
            src="/mb_logo.svg"
            alt="Marda Bang"
            className="auth-logo"
          />

          <h1>Marda Bang</h1>

          <p>
            People-first HRMS platform for attendance, payroll,
            compliance, and workforce visibility across your
            organization.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">

          <div className="auth-card-logo">
            <img
              src="/mb_logo.svg"
              alt="Marda Bang"
            />
          </div>

          <span className="auth-kicker">
            Secure workspace access
          </span>

          <h2>Welcome back</h2>

          <p>
            Sign in to continue to Marda Bang HRMS.
          </p>

          <form
            onSubmit={handleLogin}
            className="auth-form"
          >

            <div className="form-group">
              <label>Email or Phone Number</label>

              <input
                type="text"
                name="loginId"
                placeholder="Admin email or supervisor/employee phone number"
                value={form.loginId}
                onChange={handleChange}
                autoComplete="username"
                required
              />
              <small>Admins use their registered email. Supervisors and employees use their registered phone number.</small>
            </div>

            <div className="form-group">

              <label>Password</label>

              <div className="password-input-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <span className="material-symbols-outlined">
                    {showPassword
                      ? "visibility_off"
                      : "visibility"}
                  </span>
                </button>

              </div>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              className="auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          <div className="auth-footer">
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <div className="auth-footer">
            <span>
              Need an account? Contact your organization administrator.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
