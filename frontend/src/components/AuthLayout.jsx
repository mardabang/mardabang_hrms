import React from "react";

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <img
            src="/mb_logo.svg"
            alt="Marda Bang"
            className="auth-logo"
          />

          <h1>Marda Bang HRMS</h1>

          <p>
            Secure Human Resource Management System for MBIPL, MBQS and MSI.
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>{title}</h2>
          <p>{subtitle}</p>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
