import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActivityLog, subscribeToActivities } from "../data/activityLog";

const formatAttendanceTime = (record) => {
  const time = record.checkOutTime || record.checkInTime;
  if (!time) return record.attendanceDate || "Today";
  return `${record.attendanceDate || "Today"}, ${String(time).slice(0, 5)}`;
};

const RecentActivity = ({ attendanceRecords = [] }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState(getActivityLog);

  useEffect(() => subscribeToActivities(setActivities), []);

  const databaseActivities = [...attendanceRecords]
    .sort((first, second) => String(second.checkOutTime || second.checkInTime || "").localeCompare(String(first.checkOutTime || first.checkInTime || "")))
    .map((record) => ({
      id: `attendance-${record.id || record.employeeCode}`,
      icon: record.checkOutTime ? "logout" : "how_to_reg",
      title: record.checkOutTime ? "Check-out recorded" : "Check-in recorded",
      description: `${record.employeeName} (${record.employeeCode}) · ${String(record.status || "PRESENT").replaceAll("_", " ")}`,
      time: formatAttendanceTime(record),
      path: "/attendance",
    }));
  const nonAttendanceActivities = activities.filter((activity) => activity.path !== "/attendance");
  const visibleActivities = [...databaseActivities, ...nonAttendanceActivities].slice(0, 4);

  return (
    <div className="dashboard-card activity-card">
      <div className="card-header">
        <h3>Recent Activity</h3>
        <button className="details-button" onClick={() => navigate("/activity")}>View All</button>
      </div>

      <div className="activity-list">
        {visibleActivities.map((activity, index) => (
          <button type="button" className="activity-item" key={activity.id} onClick={() => navigate(activity.path)} aria-label={`${activity.title}: ${activity.description}`}>
            <span className={`timeline-dot ${index === 0 ? "current" : ""}`}>
              <span className="material-symbols-outlined">{activity.icon}</span>
            </span>
            <span className="activity-content">
              <strong>{activity.title}</strong>
              <span>{activity.description}</span>
              <small>{activity.time}</small>
            </span>
            <span className="material-symbols-outlined activity-item-arrow">chevron_right</span>
          </button>
        ))}
        {!visibleActivities.length && <p className="monthly-attendance-empty">No recent activity.</p>}
      </div>
    </div>
  );
};

export default RecentActivity;
