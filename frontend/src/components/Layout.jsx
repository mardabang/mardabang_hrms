import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useTheme } from "../context/ThemeContext";
import { useFirm } from "../context/FirmContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { getEmployeeFirm } from "../utils/employeePortal";

const Layout = ({ children }) => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.matchMedia("(max-width: 900px)").matches
  );

  const { darkMode } = useTheme();
  const { selectedFirm } = useFirm();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const pageFirm = user?.role === "EMPLOYEE" || pathname.startsWith("/employee/") ? getEmployeeFirm(user) : selectedFirm;

  useEffect(() => {
    const mobileLayout = window.matchMedia("(max-width: 900px)");
    const closeSidebarOnMobile = (event) => {
      if (event.matches) setSidebarCollapsed(true);
    };

    mobileLayout.addEventListener("change", closeSidebarOnMobile);
    return () => mobileLayout.removeEventListener("change", closeSidebarOnMobile);
  }, []);

  return (
    <div className={`app-layout ${darkMode ? "dark-mode" : ""}`}>

      <Sidebar
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarCollapsed(true)}
      />

      {!sidebarCollapsed && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div className="main-area">

        <Header
          onMenuClick={() => setSidebarCollapsed(false)}
        />

        <main className="main-content">
          {pageFirm && <div className="selected-firm-page-label">
            <span className="material-symbols-outlined">business</span>
            {pageFirm.code}{pageFirm.name ? ` - ${pageFirm.name}` : ""}
          </div>}
          {children}
        </main>

      </div>

    </div>
  );
};

export default Layout;
