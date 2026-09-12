import React from "react";
import { useNavigate } from "react-router-dom";

const AttendanceOverview = ({ summary, loading }) => {
  const navigate = useNavigate();
  const total = summary?.total || 0;
  const present = summary?.present || 0;
  const absent = summary?.absent || 0;
  const paidLeave = summary?.paidLeave || 0;
  const offHoliday = (summary?.weeklyOff || 0) + (summary?.holiday || 0);
  const notMarked = summary?.notMarked || 0;
  const percent = total ? Math.round((present / total) * 100) : 0;
  const percentage = (value) => (total ? (value / total) * 100 : 0);
  const presentEnd = percentage(present);
  const absentEnd = presentEnd + percentage(absent);
  const leaveEnd = absentEnd + percentage(paidLeave);
  const offEnd = leaveEnd + percentage(offHoliday);
  const chartBackground = total
    ? `conic-gradient(var(--black) 0% ${presentEnd}%, var(--primary) ${presentEnd}% ${absentEnd}%, #8f6f6c ${absentEnd}% ${leaveEnd}%, #b8b8b8 ${leaveEnd}% ${offEnd}%, #e8e8e8 ${offEnd}% 100%)`
    : "#e8e8e8";

  return (
    <div className="dashboard-card attendance-card">
      <div className="card-header">
        <h3>Today&apos;s Attendance</h3>
        <button className="icon-button" onClick={() => navigate("/attendance")} title="Open Attendance">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <div className="attendance-content">
        <div className="donut-wrapper">
          <div className="donut-chart" style={{ background: chartBackground }}>
            <div className="donut-center">
              <strong>{loading ? "—" : `${percent}%`}</strong>
              <span>present</span>
            </div>
          </div>
        </div>

        <div className="attendance-legend">
          <div className="legend-item"><span className="legend-color present"></span><span>Present ({present})</span></div>
          <div className="legend-item"><span className="legend-color absent"></span><span>Absent ({absent})</span></div>
          <div className="legend-item"><span className="legend-color leave"></span><span>Paid Leave ({paidLeave})</span></div>
          <div className="legend-item"><span className="legend-color holiday"></span><span>Off/Holiday ({offHoliday})</span></div>
          <div className="legend-item"><span className="legend-color not-marked"></span><span>Not Marked ({notMarked})</span></div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceOverview;
