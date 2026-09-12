import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { buildAttendanceNotifications } from "../data/attendanceNotifications";

const Notifications = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/employees"), api.get("/attendance/today")])
      .then(([employeeResponse, attendanceResponse]) => {
        setEmployees(Array.isArray(employeeResponse.data) ? employeeResponse.data : []);
        setAttendanceRecords(Array.isArray(attendanceResponse.data) ? attendanceResponse.data : []);
      })
      .catch((err) => setError(err?.response?.data?.message || "Could not load notifications."));
  }, []);

  const summary = useMemo(() => {
    const activeEmployees = employees.filter(
      (employee) => employee.active !== false && String(employee.status || "Active").toLowerCase() !== "inactive"
    );
    const activeCodes = new Set(activeEmployees.map((employee) => employee.employeeCode));
    const recordedCodes = new Set(attendanceRecords.filter((record) => activeCodes.has(record.employeeCode)).map((record) => record.employeeCode));
    return { notMarked: activeEmployees.filter((employee) => !recordedCodes.has(employee.employeeCode)).length };
  }, [attendanceRecords, employees]);

  const notifications = buildAttendanceNotifications(summary, attendanceRecords);

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Live attendance updates and actions requiring attention.</p>
        </div>
      </div>
      {error && <p className="attendance-validation-error">{error}</p>}
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div className={`alert-card ${notification.type}`} key={notification.id}>
            <span className="material-symbols-outlined">{notification.icon}</span>
            <div><strong>{notification.label}</strong><p>{notification.message}</p></div>
            <button type="button" onClick={() => navigate(notification.path)}>{notification.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
