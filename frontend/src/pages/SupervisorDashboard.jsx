import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getRecordedPosition } from "../utils/preciseLocation";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import useDepartments from "../hooks/useDepartments";

const formatTime = (value) => {
  if (!value) return "--";

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    const h = Number(match[1]);

    return `${String(h % 12 || 12).padStart(2, "0")}:${match[2]} ${
      h >= 12 ? "PM" : "AM"
    }`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeStatus = (status) => {
  const s = String(status || "").toUpperCase();

  if (s === "COMPLETED") return "Completed";
  if (s === "LATE") return "Late";
  if (s === "PRESENT") return "Working";

  return "Pending";
};

const indexAttendance = (records) => {
  const map = new Map();

  records.forEach((record) => {
    const code = normalizeCode(record.employeeCode);

    if (!code) return;

    const priority =
      (record.checkOutTime
        ? 2
        : record.checkInTime
        ? 1
        : 0) *
        1000000000 +
      (Number(record.id) || 0);

    const current = map.get(code);

    const currentPriority = current
      ? (current.checkOutTime
          ? 2
          : current.checkInTime
          ? 1
          : 0) *
          1000000000 +
        (Number(current.id) || 0)
      : -1;

    if (priority > currentPriority) {
      map.set(code, record);
    }
  });

  return map;
};

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedFirm } = useFirm();

  const [employees, setEmployees] = useState([]);

  const [department, setDepartment] = useState("");
  const { items: departmentRecords, loading: departmentsLoading, error: departmentsError } = useDepartments(selectedFirm?.id, false);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // SHIFTS FROM BACKEND
  // =========================================================

  const [shiftOptions, setShiftOptions] = useState([]);
  const [shift, setShift] = useState("");

  const recordedBy =
    user?.email ||
    user?.username ||
    "Inputer";

  /* ---------------------------------------------------------
     LOAD SHIFTS FROM BACKEND
  --------------------------------------------------------- */

  useEffect(() => {
    const loadShifts = async () => {
      try {
        const response = await api.get("/attendance/shifts");

        console.log("SHIFTS FROM BACKEND:", response.data);

        const shifts = Array.isArray(response.data)
          ? response.data
          : [];

        setShiftOptions(shifts);

        if (shifts.length > 0) {
          setShift((currentShift) => {
            const currentExists = shifts.some(
              (item) => item.value === currentShift
            );

            return currentExists
              ? currentShift
              : shifts[0].value;
          });
        } else {
          setShift("");
        }
      } catch (err) {
        console.error(
          "Could not load shifts:",
          err?.response?.status,
          err?.response?.data || err.message
        );

        setShiftOptions([]);
        setShift("");
      }
    };

    loadShifts();
  }, []);

  /* ---------------------------------------------------------
     GET SHIFT DETAILS FROM BACKEND DATA
  --------------------------------------------------------- */

  const getShiftDetails = useCallback(
    (shiftValue) => {
      if (!shiftValue) return null;

      return (
        shiftOptions.find(
          (shiftOption) =>
            shiftOption.value === shiftValue
        ) || null
      );
    },
    [shiftOptions]
  );

  /* ---------------------------------------------------------
     ACTIVE SHIFT DETAILS
  --------------------------------------------------------- */

  const activeShiftDetails = useMemo(() => {
    return getShiftDetails(shift);
  }, [getShiftDetails, shift]);

  /* ---------------------------------------------------------
     LOAD EMPLOYEES + TODAY ATTENDANCE
  --------------------------------------------------------- */

  const loadDashboard = useCallback(async () => {
    if (!selectedFirm?.code) return;

    try {
      const requestId = Date.now();

      const [employeeRes, attendanceRes] = await Promise.all([
        api.get("/employees", {
          params: {
            firmCode: selectedFirm.code,
            _t: requestId,
          },
        }),

        api.get("/attendance/today", {
          params: {
            firmCode: selectedFirm.code,
            _t: requestId,
          },
        }),
      ]);

      const records = indexAttendance(
        attendanceRes.data || []
      );

      const activeEmployees = (
        employeeRes.data || []
      ).filter(
        (employee) =>
          employee.active !== false &&
          String(employee.status || "").toLowerCase() !==
            "inactive"
      );

      const mappedEmployees = activeEmployees.map(
        (employee) => {
          const record = records.get(
            normalizeCode(employee.employeeCode)
          );

          return {
            id: employee.employeeCode,

            name: employee.name,

            department:
              employee.department || "Unassigned",


            /*
             * Shift comes from attendance record.
             *
             * If no attendance record exists yet, use the
             * selected backend shift so that the employee
             * can be checked in using the selected shift.
             */
            shift:
              record?.shift ||
              employee.shift ||
              shift ||
              "",

            status: normalizeStatus(record?.status),

            checkIn: formatTime(
              record?.checkInTime
            ),

            checkOut: formatTime(
              record?.checkOutTime
            ),

            overtime: Number(
              record?.overtime || 0
            ).toFixed(1),
          };
        }
      );

      setEmployees(mappedEmployees);
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Could not load employee attendance."
      );
    }
  }, [selectedFirm?.code, shift]);

  /* ---------------------------------------------------------
     AUTO REFRESH
  --------------------------------------------------------- */

  useEffect(() => {
    if (!selectedFirm?.code) return;

    loadDashboard();

    const interval = setInterval(
      loadDashboard,
      30000
    );

    return () => clearInterval(interval);
  }, [
    loadDashboard,
    selectedFirm?.code,
  ]);

  /* ---------------------------------------------------------
     DEPARTMENTS
  --------------------------------------------------------- */

  const departments = useMemo(() => {
    return departmentRecords.map((record) => record.name);
  }, [departmentRecords]);

  useEffect(() => {
    if (!departmentsLoading && !departmentsError && department && !departments.includes(department)) setDepartment("");
  }, [department, departments, departmentsLoading, departmentsError]);

  useEffect(() => { setDepartment(""); }, [selectedFirm?.id]);

  /* ---------------------------------------------------------
     DEPARTMENT FILTER
  --------------------------------------------------------- */


  /* ---------------------------------------------------------
     FILTER EMPLOYEES
  --------------------------------------------------------- */

  const filteredEmployees = useMemo(() => {
    const searchText = search
      .trim()
      .toLowerCase();

    return employees.filter((employee) => {
      const departmentMatch =
        !department ||
        employee.department === department;


      const shiftMatch =
        !shift ||
        employee.shift === shift;

      const searchMatch =
        !searchText ||
        String(employee.name || "")
          .toLowerCase()
          .includes(searchText) ||
        String(employee.id || "")
          .toLowerCase()
          .includes(searchText);

      return (
        departmentMatch &&
        shiftMatch &&
        searchMatch
      );
    });
  }, [
    department,
    employees,
    shift,
    search,
  ]);

  /* ---------------------------------------------------------
     STATISTICS
  --------------------------------------------------------- */

  const stats = useMemo(() => {
    const assigned =
      filteredEmployees.length;

    const present =
      filteredEmployees.filter(
        (employee) =>
          employee.status === "Working" ||
          employee.status === "Completed" ||
          employee.status === "Late"
      ).length;
      // console.log("");
    const late =
      filteredEmployees.filter(
        (employee) =>
          employee.status === "Late"
      ).length;

    const pending =
      filteredEmployees.filter(
        (employee) =>
          employee.status === "Pending"
      ).length;

    const absent = Math.max(
      assigned -
        present -
        late -
        pending,
      0
    );

    return {
      assigned,
      present,
      absent,
      late,
      pending,
    };
  }, [filteredEmployees]);

  /* ---------------------------------------------------------
     DEPARTMENT CHANGE
  --------------------------------------------------------- */

  const handleDepartmentChange = (event) => {
    setDepartment(event.target.value);
  };

  /* ---------------------------------------------------------
     LOCATION
  --------------------------------------------------------- */

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(
          new Error(
            "Location requires HTTPS."
          )
        );

        return;
      }

      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not supported by this browser."
          )
        );

        return;
      }

      getRecordedPosition(
        ({ coords }) => {
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        },

        (error) => {
          reject(
            new Error(
              error.message
            )
          );
        },

        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        }
      );
    });

  /* ---------------------------------------------------------
     CHECK IN / CHECK OUT
  --------------------------------------------------------- */

  const handlePunch = async (
    employeeId,
    action
  ) => {
    const employee = employees.find(
      (item) =>
        normalizeCode(item.id) ===
        normalizeCode(employeeId)
    );

    if (!employee) return;

    setLoading(true);
    setError("");

    try {
      if (action === "checkin") {
        const location =
          await getCurrentLocation();

        await api.post(
          "/attendance/checkin",
          {
            firmCode: selectedFirm.code,
            employeeCode: employee.id,
            employeeName: employee.name,
            department:
              employee.department,

            // Shift selected from backend
            shift: employee.shift,

            recordedBy,

            latitude:
              location.latitude,

            longitude:
              location.longitude,
            accuracy: location.accuracy,
          }
        );
      } else {
        const location = await getCurrentLocation();
        await api.post(
          `/attendance/checkout/${encodeURIComponent(
            employee.id
          )}`,
          {
            recordedBy,
            firmCode: selectedFirm.code,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          }
        );
      }

      await loadDashboard();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Attendance action failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     STATUS CLASS
  --------------------------------------------------------- */

  const getStatusClass = (status) => {
    switch (status) {
      case "Working":
        return "supervisor-status supervisor-status-working";

      case "Late":
        return "supervisor-status supervisor-status-late";

      case "Completed":
        return "supervisor-status supervisor-status-completed";

      default:
        return "supervisor-status supervisor-status-pending";
    }
  };

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <div className="dashboard-page supervisor-dashboard">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>Supervisor Dashboard</h1>
          <p>Live overview of employee attendance and daily check-ins.</p>
        </div>
        <div className="page-header-actions">
          <button className="primary-button" onClick={() => navigate("/employees/add")}>
            <span className="material-symbols-outlined">person_add</span>
            Add Employee
          </button>
          <button className="primary-button" onClick={() => navigate("/supervisor-attendance")}>
            <span className="material-symbols-outlined">calendar_today</span>
            View Attendance
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { title: "Present Today", value: stats.present, icon: "check_circle", trend: "Today", trendType: "neutral" },
          { title: "Absent Today", value: stats.absent, icon: "cancel", trend: "Today", trendType: "neutral" },
          { title: "Late Today", value: stats.late, icon: "schedule", trend: "Today", trendType: "neutral" },
          { title: "Not Marked Today", value: stats.pending, icon: "pending_actions", trend: "Today", trendType: "pending" },
        ].map(stat => <StatCard key={stat.title} {...stat} to="/supervisor-attendance" />)}
      </div>

      {/* =====================================================
          FILTER / SCOPE CARD
      ===================================================== */}

      <div className="dashboard-card supervisor-scope-card">

        <div className="supervisor-card-header">
          <div>
            <h3>Attendance Scope</h3>

            <p>
              Narrow the view by department and shift.
            </p>
          </div>

        </div>

        <div className="scope-select-grid">

          {/* Department */}

          <div className="scope-select-card">
            <label htmlFor="supervisor-department">
              Department
            </label>

            <div className="supervisor-select-wrapper">
              <span className="material-symbols-outlined">
                apartment
              </span>

              <select
                id="supervisor-department"
                value={department}
                disabled={departmentsLoading || !selectedFirm?.id}
                onChange={
                  handleDepartmentChange
                }
              >
                <option value="">{departmentsLoading ? "Loading departments…" : "All Departments"}</option>

                {departments.map(
                  (departmentName) => (
                    <option
                      key={departmentName}
                      value={departmentName}
                    >
                      {departmentName}
                    </option>
                  )
                )}
              </select>
            </div>
            {departmentsError && <p className="form-field-error" role="alert">{departmentsError}</p>}
            {!departmentsLoading && !departmentsError && !departments.length && selectedFirm?.id && <small>No departments have been added for this company.</small>}
          </div>

          {/* Shift */}

          <div className="scope-select-card">
            <label htmlFor="supervisor-shift">
              Shift
            </label>

            <div className="supervisor-select-wrapper">
              <span className="material-symbols-outlined">
                schedule
              </span>

              <select
                id="supervisor-shift"
                value={shift}
                onChange={(event) =>
                  setShift(
                    event.target.value
                  )
                }
              >
                {shiftOptions.length === 0 && (
                  <option value="">
                    No Shifts Available
                  </option>
                )}

                {shiftOptions.map(
                  (shiftOption) => (
                    <option
                      key={shiftOption.value}
                      value={shiftOption.value}
                    >
                      {shiftOption.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* =================================================
            DYNAMIC SHIFT INFORMATION
        ================================================= */}

        <div className="shift-info-bar">

          {/* Expected In */}

          <div className="shift-info-item">
            <div className="shift-info-icon">
              <span className="material-symbols-outlined">
                login
              </span>
            </div>

            <div>
              <small>
                Expected In
              </small>

              <strong>
                {activeShiftDetails?.start
                  ? formatTime(
                      activeShiftDetails.start
                    )
                  : "--"}
              </strong>
            </div>
          </div>

          {/* Expected Out */}

          <div className="shift-info-item">
            <div className="shift-info-icon">
              <span className="material-symbols-outlined">
                logout
              </span>
            </div>

            <div>
              <small>
                Expected Out
              </small>

              <strong>
                {activeShiftDetails?.end
                  ? formatTime(
                      activeShiftDetails.end
                    )
                  : "--"}
              </strong>
            </div>
          </div>

          {/* Shift Hours */}

          <div className="shift-info-item">
            <div className="shift-info-icon">
              <span className="material-symbols-outlined">
                timer
              </span>
            </div>

            <div>
              <small>
                Shift Hours
              </small>

              <strong>
                {activeShiftDetails?.hours !==
                undefined &&
                activeShiftDetails?.hours !==
                  null
                  ? `${activeShiftDetails.hours} hrs`
                  : "--"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          EMPLOYEE TABLE
      ===================================================== */}

      <div className="dashboard-card supervisor-table-card">

        {/* Table Header */}

        <div className="supervisor-table-header">
          <div>
            <h3>
              Today's Employee Attendance
            </h3>

            <p>
              {filteredEmployees.length} employees in the current view
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary supervisor-refresh-btn"
            onClick={loadDashboard}
            disabled={loading}
            title="Refresh attendance"
          >
            <span className="material-symbols-outlined">
              refresh
            </span>

            Refresh
          </button>
        </div>

        {/* Search */}

        <div className="employee-filter supervisor-filter-row">

          <div className="supervisor-search">

            <span className="material-symbols-outlined">
              search
            </span>

            <input
              type="text"
              aria-label="Search employees by name or code"
              placeholder="Search employee..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            {search && (
              <button
                type="button"
                className="supervisor-search-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="auth-error supervisor-error">

            <span className="material-symbols-outlined">
              error
            </span>

            {error}
          </div>
        )}

        {/* Table */}

        <div className="supervisor-table-wrapper">

          <table className="employee-table supervisor-employee-table">

            <thead>
              <tr>
                <th>Employee</th>
                <th>Expected In</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>OT</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredEmployees.map(
                (employee) => {

                  const employeeShift =
                    getShiftDetails(
                      employee.shift
                    );

                  return (
                    <tr key={employee.id}>

                      {/* Employee */}

                      <td>
                        <div className="supervisor-employee">

                          <div className="supervisor-avatar">
                            {getInitials(
                              employee.name
                            )}
                          </div>

                          <div className="supervisor-employee-info">

                            <strong>
                              {employee.name}
                            </strong>

                            <span>
                              {employee.id}
                            </span>

                            <small>
                              {employee.department}
                            </small>

                          </div>
                        </div>
                      </td>

                      {/* Expected In */}

                      <td>
                        <span className="supervisor-time">

                          {employeeShift?.start
                            ? formatTime(
                                employeeShift.start
                              )
                            : "--"}

                        </span>
                      </td>

                      {/* Check In */}

                      <td>
                        <span
                          className={
                            employee.checkIn ===
                            "--"
                              ? "supervisor-time supervisor-time-muted"
                              : "supervisor-time"
                          }
                        >
                          {employee.checkIn}
                        </span>
                      </td>

                      {/* Check Out */}

                      <td>
                        <span
                          className={
                            employee.checkOut ===
                            "--"
                              ? "supervisor-time supervisor-time-muted"
                              : "supervisor-time"
                          }
                        >
                          {employee.checkOut}
                        </span>
                      </td>

                      {/* Status */}

                      <td>
                        <span
                          className={getStatusClass(
                            employee.status
                          )}
                        >
                          <span className="supervisor-status-dot" />

                          {employee.status}
                        </span>
                      </td>

                      {/* OT */}

                      <td>
                        <span className="supervisor-ot">
                          {employee.overtime} hrs
                        </span>
                      </td>

                      {/* Action */}

                      <td>
                        <div className="supervisor-action">

                          {employee.status ===
                          "Pending" ? (

                            <button
                              type="button"
                              className="btn btn-primary supervisor-action-btn"
                              disabled={
                                loading
                              }
                              onClick={() =>
                                handlePunch(
                                  employee.id,
                                  "checkin"
                                )
                              }
                            >
                              <span className="material-symbols-outlined">
                                login
                              </span>

                              Check In
                            </button>

                          ) : employee.status ===
                            "Completed" ? (

                            <span className="supervisor-completed-action">

                              <span className="material-symbols-outlined">
                                check_circle
                              </span>

                              Completed
                            </span>

                          ) : (

                            <button
                              type="button"
                              className="btn btn-primary supervisor-action-btn"
                              disabled={
                                loading
                              }
                              onClick={() =>
                                handlePunch(
                                  employee.id,
                                  "checkout"
                                )
                              }
                            >
                              <span className="material-symbols-outlined">
                                logout
                              </span>

                              Check Out
                            </button>

                          )}

                        </div>
                      </td>

                    </tr>
                  );
                }
              )}

              {!filteredEmployees.length && (
                <tr>

                  <td
                    colSpan="7"
                    className="supervisor-empty"
                  >

                    <div className="supervisor-empty-state">

                      <span className="material-symbols-outlined">
                        person_search
                      </span>

                      <strong>
                        No employees found
                      </strong>

                      <span>
                        Try changing your
                        filters or search.
                      </span>

                    </div>

                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
