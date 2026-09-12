import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      // The backend always responds the same way whether or not the email
      // exists or belongs to an Admin account — this page does the same.
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Something went wrong. Please try again."
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
          <p>Reset access to your Admin account.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <img src="/mb_logo.svg" alt="Marda Bang" />
          </div>

          <h2>Forgot Password</h2>
          <p>Enter your Admin email and we'll send you a reset link.</p>

          {submitted ? (
            <div className="auth-message">
              If that email belongs to an Admin account, a reset link has been sent.
              Check your inbox — the link is valid for 30 minutes.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPassword;
