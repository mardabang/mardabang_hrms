import React from "react";
import { useNavigate } from "react-router-dom";
import { buildAttendanceNotifications } from "../data/attendanceNotifications";

const Alerts = ({ summary, attendanceRecords = [] }) => {
  const navigate = useNavigate();
  const notifications = buildAttendanceNotifications(summary, attendanceRecords);

  return (
    <div className="alerts-section">

      <h3 className="section-label">
        Alerts & Notices
      </h3>

      <div className="alerts-list">

        {notifications.map((notification) => (
        <div className={`alert-card ${notification.type}`} key={notification.id}>

          <span className="material-symbols-outlined">
            {notification.icon}
          </span>

          <div>
            <strong>{notification.label}</strong>
            <p>
              {notification.message}
            </p>
          </div>

          <button type="button" onClick={() => navigate("/attendance")}>
            View
          </button>

        </div>
        ))}

      </div>

    </div>
  );
};

export default Alerts;
