import React, { useState, useEffect} from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import {
  registrationPayload,
  validateRegistration,
} from "../utils/userAccess";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [firms, setFirms] = useState([]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    loginId: "",
    firmCode: "",
    employeeCode: "",
    role: "INPUTER",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
  const loadFirms = async () => {
    try {
      const res = await api.get("/firms");
      const active = (res.data || []).filter(
        (firm) => firm.active === true
      );
      setFirms(active);
    } catch (err) {
      console.error("Failed to load firms:", err);
    }
  };

  loadFirms();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]:
        name === "mobile"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
      ...(name === "role"
        ? {
            password: "",
            confirmPassword: "",
            loginId: "",
            employeeCode: "",
          }
        : {}),
    }));

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
      await api.post(
        "/auth/register",
        registrationPayload(formData)
      );

      if (formData.role === "INPUTER") {
        setSuccess(
          "Supervisor account created successfully. They can sign in using their registered phone number and password. Their registered email can be used for password recovery."
        );
      } else {
        setSuccess(
          "Admin account created successfully. They can sign in using their registered email and password."
        );
      }

      setFormData((current) => ({
        fullName: "",
        email: "",
        mobile: "",
        loginId: "",
        firmCode: "",
        employeeCode: "",
        role: current.role,
        password: "",
        confirmPassword: "",
      }));

      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      const response = err?.response?.data;

      setError(
        (typeof response === "string"
          ? response
          : response?.message) ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>User Access</h1>
          <p>
            Create login accounts for approved organization staff.
          </p>
        </div>
      </div>

      <section className="dashboard-card register-card">

        {/* Brand */}
        <div className="register-brand">
          <img src="/mb_logo.svg" alt="Marda Bang" />

          <div>
            <h2>Create Account</h2>
            <p>Manage access to your organization.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="form-group">
            <label>Full Name</label>

            <input
              type="text"
              name="fullName"
              placeholder="Enter full name"
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
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <small>
              This email will be used for password recovery.
            </small>
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

            <small>
              Enter a 10-digit contact number without +91.
            </small>
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


          {/* Firm */}
{formData.role === "INPUTER" && (
  <>
    <div className="form-group">
      <label>Firm</label>

    <select
      name="firmCode"
      value={formData.firmCode}
      onChange={handleChange}
      required
    >
      <option value="">Select Firm</option>

      {firms.map((firm) => (
        <option key={firm.id} value={firm.code}>
          {firm.code} - {firm.name}
        </option>
      ))}
    </select>

    <small>
      Select the firm this supervisor will manage.
    </small>
    </div>

    <div className="form-group">
      <label>Employee Code</label>
      <input
        type="text"
        name="employeeCode"
        value={formData.employeeCode}
        onChange={handleChange}
        placeholder="Enter the supervisor's employee code"
        required
      />
      <small>
        The employee must already exist in the selected firm. This link is required for supervisor self-attendance.
      </small>
    </div>
  </>
)}

          {/* User ID */}
          <div className="form-group">
            <label>Login User ID</label>

            <input
              type="text"
              name="loginId"
              placeholder={
                formData.role === "INPUTER"
                  ? "Your registered phone number"
                  : "Your registered email"
              }
              value={formData.role === "ADMIN" ? formData.email : formData.mobile}
              readOnly
            />

            <small>
              {formData.role === "INPUTER"
                ? "The supervisor signs in with this phone number and password."
                : "The admin signs in with this email and password."}
            </small>
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>

            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={
                  formData.role === "INPUTER"
                    ? "Create supervisor password"
                    : "Create admin password"
                }
                value={formData.password}
                onChange={handleChange}
                minLength={12}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword(!showPassword)
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

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password</label>

            <div className="password-input">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
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
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                aria-pressed={showConfirmPassword}
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
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

          {/* Error */}
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="auth-footer" role="status">
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

          {/* Back */}
          <div className="auth-footer">
            <Link to="/dashboard">
              Back to Admin Dashboard
            </Link>
          </div>

        </form>
      </section>
    </div>
  );
};

export default Register;
