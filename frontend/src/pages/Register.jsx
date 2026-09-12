import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { registrationPayload, validateRegistration } from "../utils/userAccess";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    employeeCode: "",
    role: "INPUTER",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: name === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value,
      ...(name === "role" ? { password: "", confirmPassword: "" } : {}),
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateRegistration(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", registrationPayload(formData));
      setSuccess(formData.role === "INPUTER"
        ? "Supervisor account created. They can sign in using their registered mobile number and OTP. Their firm comes from the linked employee record."
        : "Admin account created. They can sign in using their email and password.");
      setFormData(current => ({ fullName: "", email: "", mobile: "", employeeCode: "", role: current.role, password: "", confirmPassword: "" }));
    } catch (err) {
      const response = err?.response?.data;
      setError(
        (typeof response === "string" ? response : response?.message) ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="page-header"><div><h1>User Access</h1><p>Create login accounts for approved organization staff.</p></div></div>
      <section className="dashboard-card register-card">
        <div className="register-brand"><img src="/mb_logo.svg" alt="Marda Bang" /><div><h2>Create Account</h2><p>Manage access to your organization.</p></div></div>
      <form className="auth-form" onSubmit={handleSubmit}>

        {/* Full Name */}
        <div className="form-group">
          <label>Full Name</label>

          <input
            type="text"
            name="fullName"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={handleChange}
            minLength={2}
            maxLength={100}
            required
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email Address</label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Mobile */}
        <div className="form-group">
          <label>Mobile Number</label>

          <input
            type="tel"
            inputMode="numeric"
            minLength={10}
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            name="mobile"
            placeholder="Enter mobile number"
            value={formData.mobile}
            onChange={handleChange}
            required
          />
          <small>{formData.role === "INPUTER" ? "The supervisor will use this number for OTP login. Enter 10 digits without +91." : "Enter a 10-digit contact number without +91."}</small>
        </div>

        {/* Role */}
        <div className="form-group">
          <label>Role</label>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="ADMIN">Admin</option>
            <option value="INPUTER">Supervisor</option>
          </select>
        </div>

        {formData.role === "INPUTER" && (
          <div className="form-group">
            <label>Employee Code</label>
            <input
              type="text"
              name="employeeCode"
              placeholder="Enter an existing employee code"
              value={formData.employeeCode}
              onChange={handleChange}
              required
            />
            <small>Use an active employee record without an existing login. Its firm will be assigned automatically. No password is needed for a supervisor.</small>
          </div>
        )}

        {/* Password */}
        {formData.role === "ADMIN" && <>
        <div className="form-group">
          <label>Password</label>

          <div className="password-input">

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              minLength={12}
              maxLength={128}
              required
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>

          </div>
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label>Confirm Password</label>

          <div className="password-input">

            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={12}
              maxLength={128}
              required
            />

            <button
              type="button"
              className="password-toggle"
              aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
              aria-pressed={showConfirmPassword}
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            >
              <span className="material-symbols-outlined">
                {showConfirmPassword
                  ? "visibility_off"
                  : "visibility"}
              </span>
            </button>

          </div>
        </div>

        </>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {success && <div className="auth-footer" role="status">{success}</div>}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="auth-footer">
          <Link to="/dashboard">Back to Admin Dashboard</Link>
        </div>

      </form>
      </section>
    </div>
  );
};

export default Register;

