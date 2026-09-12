import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { getEmployeeFirm } from "../utils/employeePortal";

const FirmContext = createContext(null);
const STORAGE_KEY = "hrms_selected_firm_code";

export const FirmProvider = ({ children }) => {
  const { user } = useAuth();

  const [activeFirms, setActiveFirms] = useState([]);
  const [selectedFirm, setSelectedFirmState] = useState(null);

  // Wrap setSelectedFirm so every change also persists to localStorage
  const setSelectedFirm = (firm) => {
    if (user?.role === "EMPLOYEE") return;
    setSelectedFirmState(firm);
    if (firm?.code) {
      localStorage.setItem(STORAGE_KEY, firm.code);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    setActiveFirms([]);
    setSelectedFirmState(null);
    if (!user || user.role === "EMPLOYEE") return;
    let active = true;

    const loadFirms = async () => {
      try {
        const res = await api.get("/firms");
        if (!active) return;

        let firms = res.data;

        if (user.role !== "ADMIN") {
          firms = firms.filter((firm) =>
            (user.firms || []).includes(firm.code)
          );
        }

        setActiveFirms(firms);

        // Try to restore the previously selected firm from localStorage
        const savedCode = localStorage.getItem(STORAGE_KEY);

        setSelectedFirmState((current) => {
          // Already have a valid selection in memory? Keep it.
          if (current && firms.some((f) => f.code === current.code)) {
            return current;
          }

          // Otherwise try the saved code from localStorage
          const restored = savedCode
            ? firms.find((f) => f.code === savedCode)
            : null;

          return restored || firms[0] || null;
        });
      } catch (err) {
        console.error("Failed to load firms:", err);
      }
    };

    loadFirms();
    return () => { active = false; };
  }, [user]);

  return (
    <FirmContext.Provider
      value={{
        activeFirms: user?.role === "EMPLOYEE" ? [getEmployeeFirm(user)].filter(Boolean) : activeFirms,
        selectedFirm: user?.role === "EMPLOYEE" ? getEmployeeFirm(user) : selectedFirm,
        setSelectedFirm,
      }}
    >
      {children}
    </FirmContext.Provider>
  );
};

export const useFirm = () => {
  const context = useContext(FirmContext);

  if (!context) {
    throw new Error("useFirm must be used inside FirmProvider");
  }

  return context;
};
