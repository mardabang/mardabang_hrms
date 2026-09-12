import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useFirm } from "../context/FirmContext";   // add this import

import StatCard from "../components/StatCard";
import AttendanceOverview from "../components/AttendanceOverview";
import AttendanceStatusSummary from "../components/AttendanceStatusSummary";
import QuickActions from "../components/QuickActions";
import Alerts from "../components/Alerts";
import RecentActivity from "../components/RecentActivity";
import FirmsOverview from "../components/FirmsOverview";

const PRESENT_STATUSES = new Set(["PRESENT", "LATE", "COMPLETED", "PENDING"]);

const Dashboard = () => {
  const navigate = useNavigate();
  const { selectedFirm } = useFirm();   // add this line

  const [employees, setEmployees] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedFirm?.code) return;   // wait until a firm is selected

    let active = true;

    const loadDashboard = async () => {
      try {
        const [employeeResponse, attendanceResponse] = await Promise.all([
          api.get("/employees", {
            params: { firmCode: selectedFirm.code },
          }),
          api.get("/attendance/today", {
            params: { firmCode: selectedFirm.code },
          }),
        ]);
        if (!active) return;
        setEmployees(Array.isArray(employeeResponse.data) ? employeeResponse.data : []);
        setTodayRecords(Array.isArray(attendanceResponse.data) ? attendanceResponse.data : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Could not load live dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadDashboard);
    };
  }, [selectedFirm?.code]);   // re-fetch when firm changes

  // ...rest of the component stays exactly the same

  const attendance = useMemo(() => {
    const activeEmployees = employees.filter(
      (employee) => employee.active !== false && String(employee.status || "Active").toLowerCase() !== "inactive"
    );
    const activeCodes = new Set(activeEmployees.map((employee) => employee.employeeCode));
    const records = todayRecords.filter((record) => activeCodes.has(record.employeeCode));
    const recordedCodes = new Set(records.map((record) => record.employeeCode));

    return {
      total: activeEmployees.length,
      present: records.filter((record) => PRESENT_STATUSES.has(record.status)).length,
      absent: records.filter((record) => record.status === "ABSENT").length,
      paidLeave: records.filter((record) => record.status === "PAID_LEAVE").length,
      weeklyOff: records.filter((record) => record.status === "WEEKLY_OFF").length,
      holiday: records.filter((record) => record.status === "HOLIDAY").length,
      notMarked: activeEmployees.filter((employee) => !recordedCodes.has(employee.employeeCode)).length,
    };
  }, [employees, todayRecords]);

  const stats = [
    { title: "Total Employees", value: loading ? "—" : attendance.total, icon: "groups", trend: "Live", trendType: "neutral" },
    { title: "Present Today", value: loading ? "—" : attendance.present, icon: "check_circle", trend: "Today", trendType: "neutral" },
    { title: "Absent Today", value: loading ? "—" : attendance.absent, icon: "cancel", trend: "Today", trendType: "neutral" },
    { title: "Not Marked Today", value: loading ? "—" : attendance.notMarked, icon: "pending_actions", trend: "Today", trendType: "pending" },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Live overview of employees and today's attendance.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/reports")}>
            <span className="material-symbols-outlined">download</span>
            Export
          </button>
          <button className="primary-button" onClick={() => navigate("/employees/add")}>
            <span className="material-symbols-outlined">add</span>
            New Entry
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>
      {error && <p className="attendance-validation-error">{error}</p>}

      <div className="dashboard-grid">
        <div className="dashboard-left">
          <div className="overview-grid">
            <AttendanceOverview summary={attendance} loading={loading} />
            <AttendanceStatusSummary summary={attendance} loading={loading} />
          </div>
          <QuickActions />
        </div>
        <div className="dashboard-right">
          <Alerts summary={attendance} attendanceRecords={todayRecords} />
          <RecentActivity attendanceRecords={todayRecords} />
        </div>
      </div>

      <FirmsOverview />
    </div>
  );
};

export default Dashboard;
