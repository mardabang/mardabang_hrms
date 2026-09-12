import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/global.css";
import "./styles/supervisor-dashboard.css";
import "./styles/theme.css";
import "./styles/attendance-entry-modal.css";
import "./styles/ledger-report.css";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { FirmProvider } from "./context/FirmContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <FirmProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </FirmProvider>
    </AuthProvider>
  </React.StrictMode>
)
