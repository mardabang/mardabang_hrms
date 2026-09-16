import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ collapsed, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = user?.role || "ADMIN";
  const { pathname } = useLocation();
  const employeePortal = role === "EMPLOYEE" || pathname.startsWith("/employee/");
  const userName = user?.fullName || user?.username || "Administrator";

  const adminMenu = [
    {
      label: "Dashboard",
      icon: "dashboard",
      path: "/dashboard",
    },
    {
      label: "Attendance",
      icon: "calendar_today",
      path: "/attendance",
    },
    { label: "Leave Management", icon: "event_available", path: "/leaves" },
    {
      label: "Employees",
      icon: "badge",
      path: "/employees",
    },
    {
      label: "Payments",
      icon: "payments",
      path: "/payments",
    },
    {
      label: "Salary",
      icon: "account_balance_wallet",
      path: "/salary",
    },
    {
      label: "Reports",
      icon: "assessment",
      path: "/reports",
    },
    {
      label: "Settings",
      icon: "settings",
      path: "/settings",
    },
    {
      label: "User Access",
      icon: "admin_panel_settings",
      path: "/register",
    },
    
  ];

  const supervisorMenu = [
    {
      label: "Dashboard",
      icon: "dashboard",
      path: "/supervisor-dashboard",
    },
    {
      label: "Attendance",
      icon: "calendar_today",
      path: "/supervisor-attendance",
    },
    { label: "Leave Management", icon: "event_available", path: "/supervisor/leaves" },
    {
      label: "Employees",
      icon: "badge",
      path: "/employees",
    },
    {
      label: "Add Employee",
      icon: "person_add",
      path: "/employees/add",
    },
  ];

  const employeeMenu = [
    { label: "Dashboard", icon: "dashboard", path: "/employee/dashboard" },
    { label: "My Attendance", icon: "calendar_today", path: "/employee/attendance" },
    { label: "My Profile", icon: "person", path: "/employee/profile" },
    { label: "Leave Management", icon: "event_available", path: "/employee/leaves" },
  ];
  const menuItems = employeePortal ? employeeMenu : role === "ADMIN" ? adminMenu : supervisorMenu;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // NEW — close the sidebar on mobile after selecting a section
const handleNavClick = () => {
  if (window.innerWidth <= 900 && onClose) {
    onClose();
  }
};

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-close" onClick={onClose}>
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Logo */}
      <div className="logo-container">
        <div className="logo-box">
          <img src="/mb_logo.svg" alt="Marda Bang" />
        </div>

        <span className="logo-caption">
          HRMS · Attendance & Payroll
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
            onClick={handleNavClick}
          >
            <span className="material-symbols-outlined">
              {item.icon}
            </span>

            <span className="nav-label">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="user-role">
          {employeePortal && role !== "EMPLOYEE" ? "Employee Portal" : userName}
          <span>{employeePortal && role !== "EMPLOYEE" ? "Preview" : role === "EMPLOYEE" ? "employee" : role === "ADMIN" ? "admin" : "supervisor"}</span>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Log out
        </button>

        <small>v0.1.0</small>
      </div>
    </aside>
  );
};

export default Sidebar;
