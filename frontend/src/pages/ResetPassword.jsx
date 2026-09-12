import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css"; // Ensure you have a CSS file for stylin

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { resetPassword } = useAuth();

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Please use the link from your email.");
      return;
    }
    if (form.newPassword.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.newPassword);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "This reset link is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <img src="/mb_logo.svg" alt="Marda Bang" className="auth-logo" />
          <h1>Marda Bang</h1>
          <p>Set a new password for your Admin account.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <img src="/mb_logo.svg" alt="Marda Bang" />
          </div>

          <h2>Reset Password</h2>

          {done ? (
            <div className="auth-message">
              Password updated. Redirecting you to login...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
  <label>New Password</label>
  <div className="password-input-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      name="newPassword"
      placeholder="At least 12 characters"
      value={form.newPassword}
      onChange={handleChange}
      required
    />
    <button
      type="button"
      className="password-toggle-btn"
      onClick={() => setShowPassword((prev) => !prev)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
    </button>
  </div>
</div>

<div className="form-group">
  <label>Confirm New Password</label>
  <div className="password-input-wrapper">
    <input
      type={showConfirm ? "text" : "password"}
      name="confirmPassword"
      placeholder="Re-enter new password"
      value={form.confirmPassword}
      onChange={handleChange}
      required
    />
    <button
      type="button"
      className="password-toggle-btn"
      onClick={() => setShowConfirm((prev) => !prev)}
      aria-label={showConfirm ? "Hide password" : "Show password"}
    >
      <span className="material-symbols-outlined">{showConfirm ? "visibility_off" : "visibility"}</span>
    </button>
  </div>
</div>
              {error && <div className="auth-error">{error}</div>}

              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
