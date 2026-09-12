import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import api from "../api/axios";
import { getEmployees, hydrateEmployees } from "../data/employees";
import { addActivity } from "../data/activityLog";
import { useFirm } from "../context/FirmContext";
import { useAuth } from "../context/AuthContext";

const statusOptions = [
  ["", "Not entered"],
  ["P", "Present"],
  ["A", "Absent"],
  ["PL", "Paid Leave"],
  ["WO", "Weekly Off"],
  ["H", "Holiday"],
];

const issueOptions = [
  ["All", "All employees"],
  ["Late", "Late check-in"],
  ["Early Checkout", "Early checkout"],
  ["Late + Early Checkout", "Late + early"],
  ["Incomplete", "Incomplete attendance"],
];

const statusLegend = [
  ["P", "Present", "present"],
  ["A", "Absent", "absent"],
  ["H", "Holiday", "holiday"],
  ["PL", "Paid Leave", "leave"],
  ["WO", "Weekly Off", "week-off"],
];

const getMonthDays = (date) => {
  const totalDays = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(
      date.getFullYear(),
      date.getMonth(),
      index + 1
    );

    return {
      date: day,
      number: index + 1,
      weekday: day.toLocaleDateString("en-US", {
        weekday: "short",
      }),
    };
  });
};

const normalizeAttendanceStatus = (status) => {
  if (!status) return "";

  const normalized = String(status).toUpperCase();

  if (
    ["PRESENT", "COMPLETED", "CHECKED_IN"].includes(normalized)
  ) {
    return "P";
  }

  if (["LATE"].includes(normalized)) {
    return "P";
  }

  if (["PENDING"].includes(normalized)) {
    return "";
  }

  if (["ABSENT"].includes(normalized)) {
    return "A";
  }

  if (["PAID_LEAVE", "PL"].includes(normalized)) {
    return "PL";
  }

  if (["WEEKLY_OFF", "WO"].includes(normalized)) {
    return "WO";
  }

  if (["HOLIDAY", "H"].includes(normalized)) {
    return "H";
  }

  return normalized;
};

const formatExportTime = (value) => {
  if (!value) return "";

  const text = String(value);

  const match = text.match(/^(\d{1,2}):(\d{2})/);

  return match
    ? `${match[1].padStart(2, "0")}:${match[2]}`
    : text;
};

const getStatusLabel = (status) => {
  const option = statusOptions.find(
    ([code]) => code === status
  );

  return option?.[1] || status || "Not entered";
};

const getCheckInCoordinate = (record, coordinate) => {
  const value = record?.[coordinate] ?? record?.[`checkIn${coordinate[0].toUpperCase()}${coordinate.slice(1)}`];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const Attendance = () => {
  const { selectedFirm } = useFirm();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });

  const [selectedDay, setSelectedDay] = useState(() => {
    return new Date().getDate();
  });

  const [search, setSearch] = useState("");

  const [issueFilter, setIssueFilter] = useState("All");

  const [locked, setLocked] = useState(false);

  const [employees, setEmployees] = useState([]);

  const [monthRecords, setMonthRecords] = useState({});

  const [entry, setEntry] = useState(null);

  const [validationError, setValidationError] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  /*
   * ---------------------------------------------------------
   * LOAD EMPLOYEES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedFirm?.code) return;
    const loadEmployees = async () => {
      try {
        await hydrateEmployees(selectedFirm.code);

        const activeEmployees = getEmployees().filter(
          (employee) =>
            employee.active !== false &&
            String(employee.status || "").toLowerCase() !== "inactive"
        );

        setEmployees(activeEmployees);
      } catch (err) {
        console.error("Failed to load employees:", err);

        setError("Could not load employees.");
      }
    };

    loadEmployees();
  }, [selectedFirm?.code]);

  /*
   * ---------------------------------------------------------
   * LOAD MONTH ATTENDANCE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!employees.length || !selectedFirm?.code) return;

    const loadMonthRecords = async () => {
      setLoading(true);
      setError("");

      const year = selectedMonth.getFullYear();

      const month = String(
        selectedMonth.getMonth() + 1
      ).padStart(2, "0");

      const lastDay = new Date(
        year,
        selectedMonth.getMonth() + 1,
        0
      ).getDate();

      try {
        const response = await api.get(
          "/attendance/range",
          {
            params: {
              from: `${year}-${month}-01`,
              to: `${year}-${month}-${String(lastDay).padStart(
                2,
                "0"
              )}`,
            },
          }
        );

        const nextMap = (response.data || []).reduce(
          (map, record) => {
            const key = record.attendanceDate;

            map[key] = [
              ...(map[key] || []),
              record,
            ];

            return map;
          },
          {}
        );

        setMonthRecords(nextMap);
      } catch (err) {
        console.error(
          "Failed to load attendance:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Could not load attendance records."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMonthRecords();

    const interval = window.setInterval(
      loadMonthRecords,
      30000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    employees,
    refreshKey,
    selectedMonth,
  ]);

  /*
   * ---------------------------------------------------------
   * MONTH / DATE HELPERS
   * ---------------------------------------------------------
   */

  const days = useMemo(
    () => getMonthDays(selectedMonth),
    [selectedMonth]
  );

  const monthLabel = selectedMonth.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  const today = new Date();

  const isCurrentMonth =
    selectedMonth.getFullYear() ===
      today.getFullYear() &&
    selectedMonth.getMonth() === today.getMonth();

  /*
   * ---------------------------------------------------------
   * GET ATTENDANCE RECORD
   * ---------------------------------------------------------
   */

  const getRecord = (employee, day) => {
    const dateKey =
      `${selectedMonth.getFullYear()}-` +
      `${String(
        selectedMonth.getMonth() + 1
      ).padStart(2, "0")}-` +
      `${String(day.number).padStart(2, "0")}`;

    const dayRecords =
      monthRecords[dateKey] || [];

    const employeeCode = String(
      employee.employeeCode || employee.id || ""
    ).trim().toUpperCase();

    const record = dayRecords
      .filter(
        (row) =>
          String(row.employeeCode || "").trim().toUpperCase() === employeeCode
      )
      .sort((first, second) => {
        const firstState = first.checkOutTime ? 2 : first.checkInTime ? 1 : 0;
        const secondState = second.checkOutTime ? 2 : second.checkInTime ? 1 : 0;
        return secondState - firstState || (Number(second.id) || 0) - (Number(first.id) || 0);
      })[0];

    /*
     * No attendance record
     */
    if (!record) {
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,

        date: dateKey,

        status: "",
        statusLabel: "Not entered",
        statusCode: "",

        checkIn: "",
        checkOut: "",

        overtime: 0,

        lateMinutes: 0,
        earlyMinutes: 0,

        incomplete: false,

        shiftName: "General",

        enteredBy: "Admin",

        /*
         * LOCATION
         */
        latitude: null,
        longitude: null,
      };
    }

    const statusCode =
      normalizeAttendanceStatus(
        record.status
      );

    const isPresent =
      statusCode === "P";

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,

      date: dateKey,

      status: statusCode,

      statusLabel:
        statusCode === "P"
          ? "Present"
          : statusCode === "A"
          ? "Absent"
          : record.status ||
            "Not entered",

      statusCode,

      checkIn:
        record.checkInTime || "",

      checkOut:
        record.checkOutTime || "",

      overtime:
        Number(record.overtime) || 0,

      lateMinutes:
        record.status === "LATE"
          ? 15
          : 0,

      earlyMinutes:
        record.checkOutTime
          ? 0
          : 0,

      incomplete:
        !record.checkOutTime &&
        isPresent,

      shiftName:
        record.shift || "General",

      enteredBy:
        record.recordedBy || "Admin",

      /*
       * LOCATION FROM BACKEND
       *
       * Handles:
       * latitude
       * longitude
       */
      latitude: getCheckInCoordinate(record, "latitude"),

      longitude: getCheckInCoordinate(record, "longitude"),
    };
  };

  /*
   * ---------------------------------------------------------
   * FILTER EMPLOYEES
   * ---------------------------------------------------------
   */

  const filteredEmployees =
    employees.filter((employee) => {
      const query =
        search.toLowerCase().trim();

      const employeeName =
        String(employee.name || "")
          .toLowerCase();

      const employeeId =
        String(employee.id || "")
          .toLowerCase();

      const matchesSearch =
        employeeName.includes(query) ||
        employeeId.includes(query);

      const matchesIssue =
        issueFilter === "All" ||
        days.some((day) => {
          const record =
            getRecord(employee, day);

          if (issueFilter === "Late") {
            return record.lateMinutes > 0;
          }

          if (
            issueFilter === "Early Checkout"
          ) {
            return record.earlyMinutes > 0;
          }

          if (
            issueFilter ===
            "Late + Early Checkout"
          ) {
            return (
              record.lateMinutes > 0 &&
              record.earlyMinutes > 0
            );
          }

          return record.incomplete;
        });

      return (
        matchesSearch &&
        matchesIssue
      );
    });

  /*
   * ---------------------------------------------------------
   * SELECTED DATE
   * ---------------------------------------------------------
   */

  const selectedDate =
    days.find(
      (day) => day.number === selectedDay
    ) || days[0];

  const selectedDateRecords =
    employees.map((employee) =>
      getRecord(employee, selectedDate)
    );

  const alerts = {
    late: selectedDateRecords.filter(
      (record) => record.lateMinutes > 0
    ).length,

    early: selectedDateRecords.filter(
      (record) => record.earlyMinutes > 0
    ).length,

    incomplete: selectedDateRecords.filter(
      (record) => record.incomplete
    ).length,
  };

  /*
   * ---------------------------------------------------------
   * OPEN ATTENDANCE ENTRY
   * ---------------------------------------------------------
   */

  const openEntry = (employee, day) => {
    if (locked || day.date > today) {
      return;
    }

    const record =
      getRecord(employee, day);

    setValidationError("");

    setEntry({
      employee,
      day,

      status:
        record.statusCode || "",

      checkIn:
        record.checkIn || "",

      checkOut:
        record.checkOut || "",

      overtime:
        Number(record.overtime) || 0,

      shiftName:
        record.shiftName || "General",

      shiftStart: "09:00",

      shiftEnd: "18:00",

      recordedBy: "Admin",

      /*
       * LOCATION
       */
      latitude:
        record.latitude,

      longitude:
        record.longitude,
    });
  };

  /*
   * ---------------------------------------------------------
   * UPDATE MODAL FIELD
   * ---------------------------------------------------------
   */

  const updateEntry = (
    field,
    value
  ) => {
    setEntry((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * SAVE ATTENDANCE
   * ---------------------------------------------------------
   */

  const saveEntry = async () => {
    if (!entry) return;

    if (!entry.status) {
      setValidationError("Select an attendance status before saving.");
      return;
    }

    if (entry.status === "P" && !entry.checkIn) {
      setValidationError("Check-in time is required for Present attendance.");
      return;
    }

    if (entry.status === "P" && entry.checkOut && entry.checkOut < entry.checkIn) {
      setValidationError("Check-out time cannot be earlier than check-in time.");
      return;
    }

    const dateKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}-${String(entry.day.number).padStart(2, "0")}`;
    const employeeCode = entry.employee.employeeCode || entry.employee.id;

    // Backend enum values. Never send the UI short codes directly.
    const backendStatus = {
      P: "PRESENT",
      A: "ABSENT",
      PL: "PAID_LEAVE",
      WO: "WEEKLY_OFF",
      H: "HOLIDAY",
    }[entry.status];

    if (!backendStatus) {
      setValidationError("Invalid attendance status.");
      return;
    }

    // OT is applicable only to 8-hour shifts. Backend remains the source of truth.
    const shiftName = entry.shiftName || entry.employee.shift || "GENERAL";
    const isEightHourShift = String(shiftName).toUpperCase().includes("EIGHT") ||
      String(shiftName).toUpperCase().includes("8 HOUR");

    let overtime = 0;
    if (entry.status === "P" && entry.checkIn && entry.checkOut && isEightHourShift) {
      const toMinutes = (time) => {
        const [hours, minutes] = String(time).split(":").map(Number);
        return hours * 60 + minutes;
      };
      const workedMinutes = toMinutes(entry.checkOut) - toMinutes(entry.checkIn);
      overtime = Math.max(0, workedMinutes - 480) / 60;
      overtime = Number(overtime.toFixed(2));
    }

    const payload = {
      firmCode: selectedFirm.code,
      employeeCode,
      employeeName: entry.employee.name,
      department: entry.employee.department,
      team: entry.employee.team || "General",
      shift: shiftName,
      attendanceDate: dateKey,
      checkInTime: entry.status === "P" ? (entry.checkIn || null) : null,
      checkOutTime: entry.status === "P" ? (entry.checkOut || null) : null,
      overtime,
      status: backendStatus,
      recordedBy: entry.recordedBy || user?.email || user?.username || "Admin",
      latitude: entry.latitude ?? null,
      longitude: entry.longitude ?? null,
    };

    try {
      setLoading(true);
      setValidationError("");
      setError("");

      await api.post("/attendance/manual", payload);

      if (typeof addActivity === "function") {
        try {
          addActivity({
            action: "Attendance updated",
            employee: entry.employee.name,
            employeeCode,
            date: dateKey,
          });
        } catch (_) {
          // Activity logging must not prevent attendance from being saved.
        }
      }

      setEntry(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      console.error("Failed to save attendance:", err);
      setValidationError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not save attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CHANGE MONTH
   * ---------------------------------------------------------
   */

  const changeMonth = (offset) => {
    setSelectedMonth((current) => {
      const next =
        new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          1
        );

      setSelectedDay(
        Math.min(
          selectedDay,
          new Date(
            next.getFullYear(),
            next.getMonth() + 1,
            0
          ).getDate()
        )
      );

      return next;
    });
  };

  /*
   * ---------------------------------------------------------
   * GO TO TODAY
   * ---------------------------------------------------------
   */

  const goToToday = () => {
    setSelectedMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDay(
      today.getDate()
    );
  };

  /*
   * ---------------------------------------------------------
   * EXPORT EXCEL
   * ---------------------------------------------------------
   */

  const handleExport = () => {
    const workbook =
      XLSX.utils.book_new();

    const monthFilePart =
      `${selectedMonth.getFullYear()}-` +
      `${String(
        selectedMonth.getMonth() + 1
      ).padStart(2, "0")}`;

    const generatedAt =
      new Date();

    const detailRows = [];

    filteredEmployees.forEach(
      (employee) => {
        days.forEach((day) => {
          const record =
            getRecord(employee, day);

          const hasAttendance =
            Boolean(
              record.status ||
                record.checkIn ||
                record.checkOut ||
                Number(record.overtime) > 0
            );

          if (!hasAttendance) {
            return;
          }

          detailRows.push([
            day.date,
            day.weekday,

            employee.employeeCode ||
              employee.id,

            employee.name,

            employee.department,

            getStatusLabel(
              record.status
            ),

            formatExportTime(
              record.checkIn
            ),

            formatExportTime(
              record.checkOut
            ),

            Number(record.overtime) > 0
              ? Number(record.overtime)
              : "",

            record.enteredBy || "",
          ]);
        });
      }
    );

    const detailData = [
      [
        `Attendance Report — ${monthLabel}`,
      ],

      [
        `Generated: ${generatedAt.toLocaleString(
          "en-IN"
        )}`,
      ],

      [],

      [
        "Date",
        "Day",
        "Employee ID",
        "Employee",
        "Department",
        "Status",
        "Check In",
        "Check Out",
        "OT Hours",
        "Recorded By",
      ],

      ...(detailRows.length
        ? detailRows
        : [
            [
              "No attendance records for this month.",
            ],
          ]),
    ];

    const detailSheet =
      XLSX.utils.aoa_to_sheet(
        detailData,
        {
          cellDates: true,
        }
      );

    detailSheet["!merges"] = [
      {
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: 0,
          c: 9,
        },
      },

      {
        s: {
          r: 1,
          c: 0,
        },
        e: {
          r: 1,
          c: 9,
        },
      },
    ];

    detailSheet["!cols"] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 28 },
    ];

    if (detailRows.length) {
      detailSheet["!autofilter"] = {
        ref: `A4:J${
          detailRows.length + 4
        }`,
      };
    }

    detailSheet["!freeze"] = {
      xSplit: 0,
      ySplit: 4,
      topLeftCell: "A5",
      activePane: "bottomLeft",
      state: "frozen",
    };

    detailRows.forEach(
      (_, index) => {
        const dateCell =
          detailSheet[
            `A${index + 5}`
          ];

        if (dateCell) {
          dateCell.z =
            "dd-mmm-yyyy";
        }

        const overtimeCell =
          detailSheet[
            `I${index + 5}`
          ];

        if (
          overtimeCell &&
          overtimeCell.v !== ""
        ) {
          overtimeCell.z = "0.0";
        }
      }
    );

    XLSX.utils.book_append_sheet(
      workbook,
      detailSheet,
      "Attendance Records"
    );

    /*
     * Monthly summary
     */

    const summaryRows =
      filteredEmployees.map(
        (employee) => {
          const employeeRecords =
            days
              .map((day) =>
                getRecord(
                  employee,
                  day
                )
              )
              .filter(
                (record) =>
                  record.status
              );

          const countStatus =
            (status) =>
              employeeRecords.filter(
                (record) =>
                  record.status ===
                  status
              ).length;

          const totalOvertime =
            employeeRecords.reduce(
              (
                total,
                record
              ) =>
                total +
                (Number(
                  record.overtime
                ) || 0),
              0
            );

          return [
            employee.employeeCode ||
              employee.id,

            employee.name,

            employee.department,

            countStatus("P"),

            countStatus("A"),

            countStatus("PL"),

            countStatus("WO"),

            countStatus("H"),

            totalOvertime || "",
          ];
        }
      );

    const summaryData = [
      [
        `Monthly Summary — ${monthLabel}`,
      ],

      [],

      [
        "Employee ID",
        "Employee",
        "Department",
        "Present",
        "Absent",
        "Paid Leave",
        "Weekly Off",
        "Holiday",
        "OT Hours",
      ],

      ...summaryRows,
    ];

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryData
      );

    summarySheet["!merges"] = [
      {
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: 0,
          c: 8,
        },
      },
    ];

    summarySheet["!cols"] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 11 },
      { wch: 11 },
      { wch: 13 },
      { wch: 13 },
      { wch: 11 },
      { wch: 11 },
    ];

    if (summaryRows.length) {
      summarySheet["!autofilter"] = {
        ref: `A3:I${
          summaryRows.length + 3
        }`,
      };
    }

    summarySheet["!freeze"] = {
      xSplit: 0,
      ySplit: 3,
      topLeftCell: "A4",
      activePane: "bottomLeft",
      state: "frozen",
    };

    summaryRows.forEach(
      (_, index) => {
        const overtimeCell =
          summarySheet[
            `I${index + 4}`
          ];

        if (
          overtimeCell &&
          overtimeCell.v !== ""
        ) {
          overtimeCell.z = "0.0";
        }
      }
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Monthly Summary"
    );

    XLSX.writeFile(
      workbook,
      `attendance-${monthFilePart}.xlsx`,
      {
        compression: true,
        cellDates: true,
      }
    );
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="attendance-page monthly-attendance-page">

      {/* PAGE HEADER */}

      <div className="page-header">
        <div>
          <h1>Attendance</h1>

          <p>
            Manage monthly attendance and
            overtime records.
          </p>
        </div>

        <div className="page-header-actions">

          <button
            className="btn btn-secondary"
            onClick={() =>
              setRefreshKey(
                (value) => value + 1
              )
            }
            disabled={loading}
          >
            <span className="material-symbols-outlined">
              refresh
            </span>

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleExport}
          >
            <span className="material-symbols-outlined">
              download
            </span>

            Export Excel
          </button>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="attendance-error-message">
          {error}
        </div>
      )}

      {/* MONTH TOOLBAR */}

      <div className="attendance-month-toolbar dashboard-card">

        <div className="attendance-month-navigation">

          <button
            className="attendance-nav-button"
            onClick={() =>
              changeMonth(-1)
            }
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined">
              chevron_left
            </span>
          </button>

          <strong>
            {monthLabel}
          </strong>

          <button
            className="attendance-nav-button"
            onClick={() =>
              changeMonth(1)
            }
            aria-label="Next month"
          >
            <span className="material-symbols-outlined">
              chevron_right
            </span>
          </button>

          <button
            className="attendance-today-button"
            onClick={goToToday}
          >
            Today
          </button>

        </div>

        <div className="attendance-toolbar-actions">

          <div
            className={`attendance-lock-state ${
              locked
                ? "locked"
                : "open"
            }`}
          >
            <span className="material-symbols-outlined">
              {locked
                ? "lock"
                : "lock_open"}
            </span>

            {locked
              ? "Locked"
              : "Open"}
          </div>

          <button
            className="btn btn-secondary attendance-lock-button"
            onClick={() =>
              setLocked(
                (current) =>
                  !current
              )
            }
          >
            <span className="material-symbols-outlined">
              {locked
                ? "lock_open"
                : "lock"}
            </span>

            {locked
              ? "Unlock month"
              : "Lock month"}
          </button>

        </div>
      </div>

      {/* ATTENDANCE TABLE */}

      <div className="dashboard-card monthly-attendance-card">

        <div className="monthly-attendance-toolbar">

          <div className="monthly-attendance-search">

            <span className="material-symbols-outlined">
              search
            </span>

            <input
              type="search"
              placeholder="Search by employee name or ID..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          <select
            className="attendance-issue-filter"
            value={issueFilter}
            onChange={(event) =>
              setIssueFilter(
                event.target.value
              )
            }
          >
            {issueOptions.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              )
            )}
          </select>

          <span className="attendance-manual-mode">
            Attendance Mode: Manual Entry
          </span>

          <span className="attendance-entry-hint">
            Click a person's date cell
            to enter attendance
          </span>

          <span className="monthly-attendance-count">
            Showing{" "}
            {filteredEmployees.length}{" "}
            of {employees.length}{" "}
            active employees
          </span>

        </div>

        <div className="monthly-attendance-table-wrapper">

          <table className="monthly-attendance-table">

            <thead>

              <tr>

                <th className="monthly-employee-heading">
                  Employee
                </th>

                {days.map((day) => {

                  const isToday =
                    isCurrentMonth &&
                    day.number ===
                      today.getDate();

                  const isFuture =
                    day.date > today;

                  return (
                    <th
                      key={day.number}
                      className={
                        `attendance-day-heading ${
                          day.number ===
                          selectedDay
                            ? "selected-day"
                            : ""
                        } ${
                          isToday
                            ? "today-day"
                            : ""
                        } ${
                          isFuture
                            ? "attendance-future-heading"
                            : ""
                        }`
                      }
                      onClick={() =>
                        setSelectedDay(
                          day.number
                        )
                      }
                    >
                      <strong>
                        {day.number}
                      </strong>

                      <span>
                        {isToday
                          ? "Today"
                          : day.weekday}
                      </span>
                    </th>
                  );
                })}

              </tr>

            </thead>

            <tbody>

              {filteredEmployees.map(
                (employee) => (

                  <tr
                    key={employee.id}
                  >

                    <td className="monthly-employee-cell">

                      <div className="monthly-employee-avatar">
                        {employee.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div>

                        <strong>
                          {employee.name}
                        </strong>

                        <span>
                          {employee.id} ·{" "}
                          {employee.department}
                        </span>

                      </div>

                    </td>

                    {days.map(
                      (day) => {

                        const record =
                          getRecord(
                            employee,
                            day
                          );

                        const isToday =
                          isCurrentMonth &&
                          day.number ===
                            today.getDate();

                        const isFuture =
                          day.date >
                          today;

                        const canEdit =
                          !locked &&
                          !isFuture;

                        const isEmpty =
                          !record.status;

                        return (
                          <td
                            key={day.number}
                            className={
                              `attendance-day-cell ${
                                day.number ===
                                selectedDay
                                  ? "selected-day-cell"
                                  : ""
                              } ${
                                isToday
                                  ? "today-day-cell"
                                  : ""
                              } ${
                                isFuture
                                  ? "attendance-future-cell"
                                  : ""
                              } ${
                                isEmpty
                                  ? "attendance-empty-cell"
                                  : ""
                              } ${
                                canEdit
                                  ? "attendance-cell-clickable"
                                  : "attendance-cell-locked"
                              }`
                            }
                            onClick={() =>
                              canEdit &&
                              openEntry(
                                employee,
                                day
                              )
                            }
                            title={
                              canEdit
                                ? isEmpty
                                  ? "Add attendance"
                                  : "View or edit attendance"
                                : isFuture
                                ? "Future date"
                                : "Attendance entry is locked"
                            }
                          >

                            <div className="attendance-cell-content">

                              {record.status ? (
                                <span
                                  className={
                                    `attendance-status-display status-${record.status.toLowerCase()}`
                                  }
                                >
                                  {record.status}
                                </span>
                              ) : canEdit ? (
                                <span
                                  className="attendance-add-action"
                                  aria-hidden="true"
                                >
                                  +
                                </span>
                              ) : null}

                              <div className="attendance-issue-indicators">

                                {record.lateMinutes >
                                  0 && (
                                  <span
                                    className="attendance-issue-icon late"
                                    title={`Late by ${record.lateMinutes} minutes`}
                                  >
                                    <span className="material-symbols-outlined">
                                      schedule
                                    </span>
                                  </span>
                                )}

                                {record.earlyMinutes >
                                  0 && (
                                  <span
                                    className="attendance-issue-icon early"
                                    title={`Early checkout by ${record.earlyMinutes} minutes`}
                                  >
                                    <span className="material-symbols-outlined">
                                      logout
                                    </span>
                                  </span>
                                )}

                                {record.incomplete && (
                                  <span
                                    className="attendance-issue-icon incomplete"
                                    title="Missing checkout or incomplete attendance"
                                  >
                                    <span className="material-symbols-outlined">
                                      warning
                                    </span>
                                  </span>
                                )}

                              </div>

                            </div>

                            {Number(
                              record.overtime
                            ) > 0 && (
                              <span className="attendance-overtime-label">
                                OT{" "}
                                {record.overtime}
                              </span>
                            )}

                          </td>
                        );
                      }
                    )}

                  </tr>

                )
              )}

              {!filteredEmployees.length && (
                <tr>
                  <td
                    className="monthly-attendance-empty"
                    colSpan={
                      days.length + 1
                    }
                  >
                    No active employees
                    found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ALERTS */}

      <div className="attendance-alerts dashboard-card">

        <div className="card-header">

          <h3>
            Attendance Alerts
          </h3>

          <span>
            {selectedDate.date.toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              }
            )}
          </span>

        </div>

        <div className="attendance-alert-items">

          <span>
            <strong className="alert-count late">
              {alerts.late}
            </strong>
            Late Check-ins
          </span>

          <span>
            <strong className="alert-count early">
              {alerts.early}
            </strong>
            Early Check-outs
          </span>

          <span>
            <strong className="alert-count incomplete">
              {alerts.incomplete}
            </strong>
            Incomplete Attendance
          </span>

        </div>

      </div>

      {/* LEGEND */}

      <div className="dashboard-card attendance-legend-card">

        <div className="card-header">
          <h3>
            Attendance Status Legend
          </h3>
        </div>

        <div className="attendance-status-legend">

          {statusLegend.map(
            ([
              code,
              label,
              className,
            ]) => (
              <span
                key={code}
                className="attendance-legend-item"
              >
                <strong
                  className={`legend-dot ${className}`}
                >
                  {code}
                </strong>

                {label}
              </span>
            )
          )}

          <span className="attendance-legend-item">
            <strong className="legend-dot overtime">
              OT
            </strong>
            Overtime hours
          </span>

          <span className="attendance-legend-item">
            <strong className="legend-dot late-indicator">
              <span className="material-symbols-outlined">
                schedule
              </span>
            </strong>
            Late
          </span>

          <span className="attendance-legend-item">
            <strong className="legend-dot early-indicator">
              <span className="material-symbols-outlined">
                logout
              </span>
            </strong>
            Early checkout
          </span>

        </div>

      </div>

      {/* =====================================================
          ATTENDANCE MODAL
          ===================================================== */}

      {entry && (

        <div
          className="attendance-modal-backdrop"
          role="presentation"
          onClick={() =>
            setEntry(null)
          }
        >

          <div
            className="attendance-details-modal attendance-entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-entry-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="attendance-modal-header">

              <div>

                <h2 id="attendance-entry-title">
                  Attendance Entry
                </h2>

                <p>
                  {entry.employee.name}
                  {" · "}
                  {entry.employee.id}
                  {" · "}
                  {entry.employee.department}
                </p>

              </div>

              <button
                className="attendance-modal-close"
                onClick={() =>
                  setEntry(null)
                }
                aria-label="Close attendance entry"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>

            </div>

            {/* DATE */}

            <div className="attendance-detail-date">
              <span className="material-symbols-outlined" aria-hidden="true">calendar_today</span>

              {entry.day.date.toLocaleDateString(
                "en-US",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}

            </div>

            {/* =================================================
                LOCATION SECTION
                ================================================= */}

            {entry.latitude !== null &&
            entry.latitude !== undefined &&
            entry.longitude !== null &&
            entry.longitude !== undefined &&
            !Number.isNaN(
              Number(entry.latitude)
            ) &&
            !Number.isNaN(
              Number(entry.longitude)
            ) ? (

              <div className="attendance-location-section">

                <div className="attendance-location-header">

                  <span className="material-symbols-outlined">
                    location_on
                  </span>

                  <div>

                    <strong>
                      Check-in Location
                    </strong>

                    <p>
                      {Number(
                        entry.latitude
                      ).toFixed(6)}
                      {", "}
                      {Number(
                        entry.longitude
                      ).toFixed(6)}
                    </p>

                  </div>

                </div>

                <a
                  className="btn btn-secondary attendance-location-button"
                  href={`https://www.google.com/maps?q=${encodeURIComponent(
                    `${entry.latitude},${entry.longitude}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >

                  <span className="material-symbols-outlined">
                    map
                  </span>

                  View on Google Maps

                </a>

              </div>

            ) : (

              <div className="attendance-location-section attendance-location-empty">

                <span className="material-symbols-outlined">
                  location_off
                </span>

                <div>

                  <strong>
                    No location recorded
                  </strong>

                  <p>
                    This attendance entry
                    does not have location
                    data.
                  </p>

                </div>

              </div>

            )}

            {/* ATTENDANCE STATUS */}

            <div className="attendance-entry-section">

              <label>

                Attendance Status

                <select
                  value={entry.status}
                  onChange={(event) =>
                    updateEntry(
                      "status",
                      event.target.value
                    )
                  }
                >

                  {statusOptions.map(
                    ([
                      value,
                      label,
                    ]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value
                          ? `${value} - `
                          : ""}
                        {label}
                      </option>
                    )
                  )}

                </select>

              </label>

            </div>

            {/* PRESENT FIELDS */}

            {entry.status === "P" && (

              <div className="attendance-entry-fields">

                <label>
                  Shift

                  <select
                    value={
                      entry.shiftName
                    }
                    onChange={(
                      event
                    ) =>
                      updateEntry(
                        "shiftName",
                        event.target.value
                      )
                    }
                  >

                    <option value="General">
                      General
                    </option>

                    <option value="Morning">
                      Morning
                    </option>

                    <option value="Evening">
                      Evening
                    </option>

                    <option value="Night">
                      Night
                    </option>

                  </select>

                </label>

                <div className="attendance-entry-shift">
                  <span>Expected</span>
                  <strong>
                  {entry.shiftStart}
                  {" - "}
                  {entry.shiftEnd}
                  </strong>

                </div>

                <label>

                  Actual Check-in

                  <input
                    type="time"
                    value={
                      entry.checkIn
                    }
                    onChange={(
                      event
                    ) =>
                      updateEntry(
                        "checkIn",
                        event.target.value
                      )
                    }
                  />

                </label>

                <label>

                  Actual Check-out

                  <input
                    type="time"
                    value={
                      entry.checkOut
                    }
                    onChange={(
                      event
                    ) =>
                      updateEntry(
                        "checkOut",
                        event.target.value
                      )
                    }
                  />

                </label>

                <div className="attendance-entry-shift attendance-entry-recorded-times">
                  <div><span>Check-in</span><strong>{entry.checkIn || "--"}</strong></div>
                  <div><span>Check-out</span><strong>{entry.checkOut || "--"}</strong></div>
                </div>

                <label>

                  Overtime hours

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      entry.overtime
                    }
                    onChange={(
                      event
                    ) =>
                      updateEntry(
                        "overtime",
                        event.target.value
                      )
                    }
                  />

                </label>

              </div>

            )}

            {/* VALIDATION */}

            {validationError && (

              <p className="attendance-validation-error">
                {validationError}
              </p>

            )}

            {/* ACTIONS */}

            <div className="attendance-entry-actions">

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setEntry(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  saveEntry
                }
              >
                Save Attendance
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Attendance;
