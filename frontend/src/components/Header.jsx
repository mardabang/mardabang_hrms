import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useFirm } from "../context/FirmContext";
import { useAuth } from "../context/AuthContext";
import { getEmployeeFirm } from "../utils/employeePortal";

const Header = ({ onMenuClick }) => {
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { activeFirms, selectedFirm, setSelectedFirm } = useFirm();
  const { user, logout } = useAuth();

  const [firmsOpen, setFirmsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const userName = user?.fullName || user?.username || "Administrator";
  const role = user?.role || "ADMIN";
  const { pathname } = useLocation();
  const employeePortal = role === "EMPLOYEE" || pathname.startsWith("/employee/");
  const employeePreview = employeePortal && role !== "EMPLOYEE";
  const employeeFirm = getEmployeeFirm(user);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(currentDate);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  const handleProfile = () => {
    setProfileOpen(false);
    navigate(employeePortal ? "/employee/profile" : "/profile");
  };

  return (
    <header className="top-header">
      {/* LEFT */}
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Firm Selector */}
        {employeePortal ? <div className="employee-firm-label"><span className="material-symbols-outlined">business</span>{employeeFirm?.code || "Employee Portal"}</div> : <div className="firm-selector">
          <button
            type="button"
            className="company-selector"
            aria-expanded={firmsOpen}
            onClick={() => {
              setFirmsOpen(!firmsOpen);
              setProfileOpen(false);
            }}
          >
            <span>{selectedFirm?.code || "Select Firm"}</span>

            <span className="material-symbols-outlined">
              {firmsOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {firmsOpen && (
            <div className="firm-menu">
              {activeFirms.map((firm) => (
                <button
                  key={firm.id || firm.code}
                  type="button"
                  className="firm-menu-item"
                  onClick={() => {
                    setSelectedFirm(firm);
                    setFirmsOpen(false);
                  }}
                >
                  <strong>{firm.code}</strong>
                  <span>{firm.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>}
      </div>

      {/* RIGHT */}
      <div className="header-right">
        {/* Date */}
        <div className="date-display">
          <span className="material-symbols-outlined">calendar_month</span>
          {formattedDate}
        </div>

        <div className="header-divider"></div>

        {/* Theme */}
        <button
          className="header-icon"
          onClick={toggleTheme}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <span className="material-symbols-outlined">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>

        {/* Notifications */}
        {!employeePortal && <button
          className="header-icon notification"
          onClick={() => navigate("/notifications")}
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="notification-dot"></span>
        </button>}

        {/* Profile */}
        <div className="profile-wrapper">
          <button
            type="button"
            className="admin-profile"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setFirmsOpen(false);
            }}
          >
            <div className="profile-icon">
              <span className="material-symbols-outlined">person</span>
            </div>

            <div className="profile-info">
              <strong>{employeePreview ? "Employee User" : userName}</strong>

              <span>
                {employeePreview ? "Preview" : role === "EMPLOYEE" ? "Employee" : role === "ADMIN" ? "Administrator" : "Supervisor"}
              </span>
            </div>

            <span className="material-symbols-outlined">
              {profileOpen ? "expand_less" : "expand_more"}
            </span>
          </button>

          {/* Profile Menu */}
          {profileOpen && (
            <div className="profile-menu">
              <button type="button" onClick={handleProfile}>
                <span className="material-symbols-outlined">person</span>
                <span>My Profile</span>
              </button>

              <button
                type="button"
                className="logout-menu-item"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
