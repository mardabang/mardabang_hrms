import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useFirm } from "../context/FirmContext";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const defaultSettings = {
  divisor: "26",
  weeklyOff: "Sunday",
  autoFillWeeklyOff: true,
  paidWeeklyOff: true,
  gracePeriod: "10",
  attendanceReminders: true,
  payrollAlerts: true,
  dateFormat: "DD/MM/YYYY",
  currency: "INR (₹)",
};

const Settings = () => {
  const navigate = useNavigate();
  const { selectedFirm } = useFirm();
  const { darkMode, toggleTheme } = useTheme();

  const [settings, setSettings] = useState(defaultSettings);

  const [saved, setSaved] = useState(false);

  const [payrollLoading, setPayrollLoading] = useState(false);
  const [systemLoading, setSystemLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /*
   * ==========================================
   * Load Settings when firm changes
   * ==========================================
   */
  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedFirm?.code) {
        return;
      }

      try {
        setError("");
        setSaved(false);

        setPayrollLoading(true);
        setSystemLoading(true);

        /*
         * Load Payroll Rules
         */
        const payrollResponse = await api.get(
          "/settings/payroll",
          {
            params: {
              firmCode: selectedFirm.code,
            },
          }
        );

        /*
         * Load System Settings
         */
        const systemResponse = await api.get(
          "/settings/system",
          {
            params: {
              firmCode: selectedFirm.code,
            },
          }
        );

        const payroll = payrollResponse.data;
        const system = systemResponse.data;

        /*
         * Update all settings together
         */
        setSettings({
          divisor: String(
            payroll.monthlySalaryDivisor ?? 26
          ),

          weeklyOff:
            payroll.weeklyOffDay
              ?.toLowerCase()
              .replace(/^\w/, (c) =>
                c.toUpperCase()
              ) || "Sunday",

          autoFillWeeklyOff:
            payroll.autoFillWeeklyOff ?? true,

          paidWeeklyOff:
            payroll.weeklyOffPaid ?? true,

          gracePeriod: String(
            system.gracePeriod ?? 10
          ),

          attendanceReminders:
            system.attendanceReminders ?? true,

          payrollAlerts:
            system.payrollAlerts ?? true,

          dateFormat:
            system.dateFormat ||
            "DD/MM/YYYY",

          currency:
            system.currency ||
            "INR (₹)",
        });
      } catch (error) {
        console.error(
          "Failed to load settings:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Failed to load settings."
        );
      } finally {
        setPayrollLoading(false);
        setSystemLoading(false);
      }
    };

    loadSettings();
  }, [selectedFirm?.code]);

  /*
   * ==========================================
   * Update Setting
   * ==========================================
   */
  const updateSetting = (field, value) => {
    setSaved(false);

    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /*
   * ==========================================
   * Save Settings
   * ==========================================
   */
  const saveSettings = async (event) => {
    event.preventDefault();

    if (!selectedFirm?.code) {
      setError("Please select a firm first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaved(false);

      /*
       * ======================================
       * Save Payroll Rules
       * ======================================
       */
      await api.put(
        "/settings/payroll",
        {
          monthlySalaryDivisor: Number(
            settings.divisor
          ),

          weeklyOffDay:
            settings.weeklyOff.toUpperCase(),

          autoFillWeeklyOff:
            settings.autoFillWeeklyOff,

          weeklyOffPaid:
            settings.paidWeeklyOff,
        },
        {
          params: {
            firmCode: selectedFirm.code,
          },
        }
      );

      /*
       * ======================================
       * Save System Settings
       * ======================================
       */
      await api.put(
        "/settings/system",
        {
          gracePeriod: Number(
            settings.gracePeriod
          ),

          attendanceReminders:
            settings.attendanceReminders,

          payrollAlerts:
            settings.payrollAlerts,

          dateFormat:
            settings.dateFormat,

          currency:
            settings.currency,

          darkTheme:
            darkMode,
        },
        {
          params: {
            firmCode: selectedFirm.code,
          },
        }
      );

      setSaved(true);
    } catch (error) {
      console.error(
        "Failed to save settings:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">

      <div className="page-header">
        <div>
          <h1>Settings</h1>

          <p>
            Manage preferences and rules for{" "}
            {selectedFirm?.code ||
              "the selected firm"}.
          </p>
        </div>
      </div>

      <form onSubmit={saveSettings}>

        {/* =========================
            Error
        ========================== */}
        {error && (
          <p
            style={{
              color: "red",
              marginBottom: "16px",
            }}
          >
            {error}
          </p>
        )}

        {/* =========================
            Firm Settings
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              business
            </span>

            <div>
              <h2>Firm Settings</h2>

              <p>
                Settings apply to the firm selected
                in the navbar.
              </p>
            </div>

          </div>

          <div className="settings-firm-summary">

            <strong>
              {selectedFirm?.code}
            </strong>

            <span>
              {selectedFirm?.name}
            </span>

            <span className="settings-active-badge">
              Active
            </span>

          </div>

        </section>


        {/* =========================
            Payroll Rules
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              payments
            </span>

            <div>
              <h2>Payroll Rules</h2>

              <p>
                Define how payroll calculations
                treat attendance and weekly offs.
              </p>
            </div>

          </div>

          {payrollLoading && (
            <p>
              Loading payroll rules...
            </p>
          )}

          <div className="settings-grid">

            <label>
              Monthly salary divisor

              <span>
                Days used to compute the per-day
                rate.
              </span>

              <input
                type="number"
                min="1"
                max="31"
                value={settings.divisor}
                onChange={(e) =>
                  updateSetting(
                    "divisor",
                    e.target.value
                  )
                }
              />
            </label>


            <label>
              Weekly off day

              <span>
                Used when calculating attendance
                and payroll.
              </span>

              <select
                value={settings.weeklyOff}
                onChange={(e) =>
                  updateSetting(
                    "weeklyOff",
                    e.target.value
                  )
                }
              >
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

          </div>


          <div className="settings-toggle-list">

            <label>
              <input
                type="checkbox"
                checked={
                  settings.autoFillWeeklyOff
                }
                onChange={(e) =>
                  updateSetting(
                    "autoFillWeeklyOff",
                    e.target.checked
                  )
                }
              />

              <span>
                <strong>
                  Auto-fill "WO" on the weekly off
                  day
                </strong>

                <small>
                  Automatically mark the selected
                  weekly off in attendance.
                </small>
              </span>
            </label>


            <label>
              <input
                type="checkbox"
                checked={
                  settings.paidWeeklyOff
                }
                onChange={(e) =>
                  updateSetting(
                    "paidWeeklyOff",
                    e.target.checked
                  )
                }
              />

              <span>
                <strong>
                  Treat weekly off as paid
                </strong>

                <small>
                  Include weekly off days in payroll.
                </small>
              </span>
            </label>

          </div>

        </section>


        {/* =========================
            Attendance
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              event_available
            </span>

            <div>
              <h2>Attendance Settings</h2>

              <p>
                Configure manual attendance rules.
              </p>
            </div>

          </div>

          {systemLoading && (
            <p>
              Loading system settings...
            </p>
          )}

          <div className="settings-grid">

            <label>
              Check-in grace period

              <span>
                Late is calculated after these
                minutes.
              </span>

              <input
                type="number"
                min="0"
                max="120"
                value={settings.gracePeriod}
                onChange={(e) =>
                  updateSetting(
                    "gracePeriod",
                    e.target.value
                  )
                }
              />
            </label>


            <div className="settings-readonly">

              <span>
                Attendance Mode
              </span>

              <strong>
                Manual Entry
              </strong>

              <small>
                Attendance is entered by authorized
                users.
              </small>

            </div>

          </div>

        </section>


        {/* =========================
            Notifications
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              notifications
            </span>

            <div>
              <h2>Notifications</h2>

              <p>
                Operational reminders.
              </p>
            </div>

          </div>

          <div className="settings-toggle-list">

            <label>

              <input
                type="checkbox"
                checked={
                  settings.attendanceReminders
                }
                onChange={(e) =>
                  updateSetting(
                    "attendanceReminders",
                    e.target.checked
                  )
                }
              />

              <span>

                <strong>
                  Attendance reminders
                </strong>

                <small>
                  Show incomplete attendance
                  reminders.
                </small>

              </span>

            </label>


            <label>

              <input
                type="checkbox"
                checked={
                  settings.payrollAlerts
                }
                onChange={(e) =>
                  updateSetting(
                    "payrollAlerts",
                    e.target.checked
                  )
                }
              />

              <span>

                <strong>
                  Payroll alerts
                </strong>

                <small>
                  Show pending payroll alerts.
                </small>

              </span>

            </label>

          </div>

        </section>


        {/* =========================
            Appearance
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              palette
            </span>

            <div>
              <h2>Appearance</h2>

              <p>
                Customize the display.
              </p>
            </div>

          </div>

          <label className="settings-theme-toggle">

            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleTheme}
            />

            <span>

              <strong>
                Dark Theme
              </strong>

              <small>
                Use dark mode across the HRMS.
              </small>

            </span>

          </label>

        </section>


        {/* =========================
            System Settings
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              tune
            </span>

            <div>
              <h2>System Settings</h2>

              <p>
                Regional display preferences.
              </p>
            </div>

          </div>

          <div className="settings-grid">

            <label>
              Date Format

              <select
                value={settings.dateFormat}
                onChange={(e) =>
                  updateSetting(
                    "dateFormat",
                    e.target.value
                  )
                }
              >
                <option value="DD/MM/YYYY">
                  DD/MM/YYYY
                </option>

                <option value="MM/DD/YYYY">
                  MM/DD/YYYY
                </option>

                <option value="YYYY-MM-DD">
                  YYYY-MM-DD
                </option>
              </select>

            </label>


            <label>
              Currency

              <select
                value={settings.currency}
                onChange={(e) =>
                  updateSetting(
                    "currency",
                    e.target.value
                  )
                }
              >
                <option value="INR (₹)">
                  INR (₹)
                </option>

                <option value="USD ($)">
                  USD ($)
                </option>

                <option value="EUR (€)">
                  EUR (€)
                </option>
              </select>

            </label>

          </div>

        </section>


        {/* =========================
            Administration
        ========================== */}
        <section className="settings-section dashboard-card">

          <div className="settings-section-header">

            <span className="material-symbols-outlined">
              admin_panel_settings
            </span>

            <div>
              <h2>Administration</h2>

              <p>
                Manage administrative tools and
                bulk operations.
              </p>
            </div>

          </div>

          <div className="settings-links-grid">

            <Link
              to="/settings/employee-import"
              className="settings-card-link"
            >

              <span className="material-symbols-outlined">
                upload_file
              </span>

              <div>

                <h3>
                  Employee Import
                </h3>

                <p>
                  Import employees using Excel or
                  CSV templates.
                </p>

              </div>

              <span className="material-symbols-outlined">
                chevron_right
              </span>

            </Link>
            
          <Link
  to="/settings/backup"
  className="settings-card-link"
>
  <span className="material-symbols-outlined">
    backup
  </span>

  <div>
    <h3>Backup & Restore</h3>
    <p>Create database backups and restore previous versions.</p>
  </div>

  <span className="material-symbols-outlined">
    chevron_right
  </span>
</Link>
          </div>

        </section>


        {/* =========================
            Save
        ========================== */}
        <div className="settings-actions">

          {saved && (
            <span>
              Settings saved successfully
            </span>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >

            <span className="material-symbols-outlined">
              {saving
                ? "hourglass_top"
                : "save"}
            </span>

            {saving
              ? "Saving..."
              : "Save Settings"}

          </button>

              
        </div>

      </form>

    </div>
  );
};

export default Settings;

