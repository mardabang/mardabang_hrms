import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { activeFirms } = useFirm();

  const userFirms = isAdmin
    ? activeFirms
    : activeFirms.filter((firm) =>
        (user?.firms || []).includes(firm.code)
      );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your account information.</p>
        </div>
      </div>

      <div className="dashboard-card profile-card">

        {/* ============================================
            IDENTITY HEADER
        ============================================ */}
        <div className="profile-identity">

          <div className="profile-avatar-circle">
            {user?.fullName
              ? user.fullName.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div className="profile-identity-text">
            <h2>{user?.fullName || "User"}</h2>

            <span
              className={`status-badge ${
                isAdmin ? "status-active" : "status-warning"
              }`}
            >
              {user?.role || "USER"}
            </span>
          </div>

        </div>

        <hr className="profile-divider" />

        {/* ============================================
            ACCOUNT DETAILS
        ============================================ */}
        <div className="profile-section">

          <h3 className="profile-section-title">
            Account Details
          </h3>

          <div className="profile-fields-grid">

            <div className="form-group">
              <label>Full Name</label>
              <div className="profile-static-field">
                <span className="material-symbols-outlined">person</span>
                {user?.fullName || "—"}
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="profile-static-field">
                <span className="material-symbols-outlined">mail</span>
                {user?.email || "—"}
              </div>
            </div>

            <div className="form-group">
              <label>Role</label>
              <div className="profile-static-field">
                <span className="material-symbols-outlined">badge</span>
                {user?.role || "—"}
              </div>
            </div>

            {user?.employeeCode && (
              <div className="form-group">
                <label>Employee Code</label>
                <div className="profile-static-field">
                  <span className="material-symbols-outlined">tag</span>
                  {user.employeeCode}
                </div>
              </div>
            )}

          </div>
        </div>

        <hr className="profile-divider" />

        {/* ============================================
            FIRM ACCESS
        ============================================ */}
        <div className="profile-section">

          <h3 className="profile-section-title">
            {isAdmin ? "Firm Access" : "Assigned Firm"}
          </h3>

          {userFirms.length ? (
            <div className="profile-firm-chips">
              {userFirms.map((firm) => (
                <span key={firm.code} className="profile-firm-chip">
                  <span className="material-symbols-outlined">apartment</span>
                  <span>
                    <strong>{firm.code}</strong>
                    <small>{firm.name}</small>
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="profile-empty-note">No firm assigned.</p>
          )}

        </div>

        <div className="profile-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Dashboard
          </button>
        </div>

      </div>

      {/* ============================================
          SCOPED STYLES
      ============================================ */}
      <style>{`
        .profile-card {
          max-width: 640px;
          padding: 28px;
        }

        .profile-identity {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .profile-avatar-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e53935, #b71c1c);
          color: #fff;
          font-size: 26px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .profile-identity-text h2 {
          margin: 0 0 6px 0;
          font-size: 20px;
        }

        .profile-divider {
          border: none;
          border-top: 1px solid #eee;
          margin: 22px 0;
        }

        .profile-section-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #888;
          margin: 0 0 16px 0;
        }

        .profile-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 20px;
        }

        .profile-static-field {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f7f7f8;
          border-radius: 8px;
          font-size: 14px;
          color: #333;
        }

        .profile-static-field .material-symbols-outlined {
          font-size: 18px;
          color: #999;
        }

        .profile-firm-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .profile-firm-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #fff5f5;
          border: 1px solid #ffd6d6;
          border-radius: 20px;
          font-size: 13px;
        }

        .profile-firm-chip .material-symbols-outlined {
          font-size: 16px;
          color: #d32f2f;
        }

        .profile-firm-chip strong {
          display: block;
          color: #b71c1c;
        }

        .profile-firm-chip small {
          display: block;
          color: #777;
          font-size: 11px;
        }

        .profile-empty-note {
          color: #999;
          font-size: 14px;
        }

        .profile-actions {
          margin-top: 24px;
        }

        @media (max-width: 640px) {
          .profile-fields-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

    </div>
  );
};

export default Profile;