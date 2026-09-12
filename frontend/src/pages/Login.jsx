import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OTP_RESEND_SECONDS = 60;

const routeForRole = (role) => {
  const value = (role || "").toUpperCase();
  if (value === "ADMIN") return "/dashboard";
  if (value === "EMPLOYEE") return "/employee/dashboard";
  return "/supervisor-dashboard";
};

const errorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

const Login = () => {
  const navigate = useNavigate();
  const { login, requestOtp, verifyOtp } = useAuth();

  const [mode, setMode] = useState("password"); // "password" | "otp"

  // Password (Admin) state
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP (Supervisor/Employee) state
  const [mobile, setMobile] = useState("");
  const [otpStep, setOtpStep] = useState("mobile"); // "mobile" | "code"
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (otpStep === "code") codeInputRef.current?.focus();
  }, [otpStep]);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setOtpError("");
    setOtpMessage("");
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await login(form.email, form.password);
      navigate(routeForRole(userData.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpMessage("");
    setOtpLoading(true);
    try {
      await requestOtp(mobile);
      setOtpStep("code");
      setOtpMessage("We've sent a 6-digit code to your mobile number.");
      setCooldown(OTP_RESEND_SECONDS);
    } catch (err) {
      setOtpError(errorMessage(err, "Could not send the code. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || otpLoading) return;
    setOtpError("");
    setOtpMessage("");
    setOtpLoading(true);
    try {
      await requestOtp(mobile);
      setOtpMessage("We've sent a new code to your mobile number.");
      setCooldown(OTP_RESEND_SECONDS);
    } catch (err) {
      setOtpError(errorMessage(err, "Could not resend the code. Please try again."));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);
    try {
      const userData = await verifyOtp(mobile, code);
      navigate(routeForRole(userData.role), { replace: true });
    } catch (err) {
      setOtpError(errorMessage(err, "Incorrect or expired code."));
    } finally {
      setOtpLoading(false);
    }
  };

  const changeMobile = () => {
    setOtpStep("mobile");
    setCode("");
    setOtpError("");
    setOtpMessage("");
  };

  return (
    <div className="auth-page login-auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <img src="/mb_logo.svg" alt="Marda Bang" className="auth-logo" />
          <h1>Marda Bang</h1>
          <p>
            People-first HRMS platform for attendance, payroll, compliance,
            and workforce visibility across your organization.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-logo">
            <img src="/mb_logo.svg" alt="Marda Bang" />
          </div>

          <span className="auth-kicker">Secure workspace access</span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to Marda Bang HRMS.</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "password" ? "active" : ""}
              onClick={() => switchMode("password")}
            >
              Admin Login
            </button>
            <button
              type="button"
              className={mode === "otp" ? "active" : ""}
              onClick={() => switchMode("otp")}
            >
              Employee / Supervisor Login
            </button>
          </div>

          {mode === "password" && (
            <>
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
  <label>Password</label>
  <div className="password-input-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      placeholder="Enter password"
      value={form.password}
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

                {error && <div className="auth-error">{error}</div>}

                <button className="auth-button" type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="auth-footer">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </>
          )}

          {mode === "otp" && otpStep === "mobile" && (
            <form onSubmit={handleSendCode} className="auth-form">
              <div className="form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  maxLength={10}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              {otpError && <div className="auth-error">{otpError}</div>}

              <button
                className="auth-button"
                type="submit"
                disabled={otpLoading || mobile.length !== 10}
              >
                {otpLoading ? "Sending..." : "Send Code"}
              </button>
            </form>
          )}

          {mode === "otp" && otpStep === "code" && (
            <form onSubmit={handleVerify} className="auth-form">
              <p className="auth-otp-target">
                Code sent to <strong>{mobile}</strong>.{" "}
                <button type="button" className="auth-link-button" onClick={changeMobile}>
                  Change number
                </button>
              </p>

              <div className="form-group">
                <label>Enter 6-digit Code</label>
                <input
                  ref={codeInputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              {otpMessage && <div className="auth-message">{otpMessage}</div>}
              {otpError && <div className="auth-error">{otpError}</div>}

              <button
                className="auth-button"
                type="submit"
                disabled={otpLoading || code.length !== 6}
              >
                {otpLoading ? "Verifying..." : "Verify & Login"}
              </button>

              <button
                type="button"
                className="auth-link-button auth-resend"
                onClick={handleResend}
                disabled={cooldown > 0 || otpLoading}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>Need an account? Contact your organization administrator.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
