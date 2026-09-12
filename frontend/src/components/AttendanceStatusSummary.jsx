import React from "react";
import { useNavigate } from "react-router-dom";

const AttendanceStatusSummary = ({ summary, loading }) => {
  const navigate = useNavigate();
  const total = summary?.total || 0;
  const marked = Math.max(0, total - (summary?.notMarked || 0));
  const percentage = (value) => (total ? Math.round((value / total) * 100) : 0);
  const offHoliday = (summary?.weeklyOff || 0) + (summary?.holiday || 0);

  return (
    <div className="dashboard-card payroll-card">
      <div className="card-header">
        <h3>Attendance Breakdown</h3>
        <button className="details-button" onClick={() => navigate("/attendance")}>Details</button>
      </div>

      <div className="payroll-content">
        <div className="payroll-month">
          <span>Attendance Date</span>
          <strong>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
        </div>

        <div className="payroll-item">
          <div className="payroll-item-header">
            <span>PRESENT</span>
            <strong>{loading ? "—" : `${summary.present} of ${total}`}</strong>
          </div>
          <div className="progress-bar"><div className="progress-fill finalized" style={{ width: `${percentage(summary?.present || 0)}%` }}></div></div>
        </div>

        <div className="payroll-item">
          <div className="payroll-item-header">
            <span>ATTENDANCE MARKED</span>
            <strong className="red-text">{loading ? "—" : `${marked} of ${total}`}</strong>
          </div>
          <div className="progress-bar"><div className="progress-fill pending" style={{ width: `${percentage(marked)}%` }}></div></div>
        </div>

        <div className="bonus-box">
          <span>Absent {summary?.absent || 0} · Leave {summary?.paidLeave || 0} · Off/Holiday {offHoliday}</span>
          <strong>{summary?.notMarked || 0} not marked</strong>
        </div>
      </div>
    </div>
  );
};

export default AttendanceStatusSummary;
