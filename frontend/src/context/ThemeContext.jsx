import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("hrms-theme") === "dark"; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("dark-mode", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    try { localStorage.setItem("hrms-theme", darkMode ? "dark" : "light"); } catch { /* Theme still works when storage is unavailable. */ }
  }, [darkMode]);

  useEffect(() => {
    const syncTheme = event => {
      if (event.key === "hrms-theme") setDarkMode(event.newValue === "dark");
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
