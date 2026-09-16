
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";

import {
  loadShifts,
  getShiftDetails,
} from "../data/attendance";

import { getRecordedPosition } from "../utils/preciseLocation";

/* =========================================================
   HELPERS
========================================================= */

const getApiErrorMessage = (error, fallback) => {
  const response = error?.response?.data;

  if (typeof response === "string" && response.trim()) {
    return response;
  }

  if (response?.message) {
    return response.message;
  }

  if (Array.isArray(response?.errors) && response.errors.length) {
    return response.errors
      .map((item) => item?.defaultMessage || item?.message)
      .filter(Boolean)
      .join(" ");
  }

  return error?.message || fallback;
};

const formatDisplayTime = (value) => {
  if (!value) return "--";

  const timeOnly = String(value).match(
    /^(\d{1,2}):(\d{2})/
  );

  if (timeOnly) {
    const hours = Number(timeOnly[1]);

    return `${String(hours % 12 || 12).padStart(
      2,
      "0"
    )}:${timeOnly[2]} ${
      hours >= 12 ? "PM" : "AM"
    }`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const normalizeEmployeeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeTimeForInput = (value) => {
  if (!value) return "";

  const match = String(value).match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) return "";

  return `${String(match[1]).padStart(
    2,
    "0"
  )}:${match[2]}`;
};

const getCurrentTimeForInput = () => {
  const now = new Date();

  return `${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;
};

const recordPriority = (record) => {
  const attendanceState = record?.checkOutTime
    ? 2
    : record?.checkInTime
      ? 1
      : 0;

  return (
    attendanceState * 1000000000 +
    (Number(record?.id) || 0)
  );
};

const indexLatestRecords = (records) => {
  const map = new Map();

  records.forEach((record) => {
    const code = normalizeEmployeeCode(
      record?.employeeCode
    );

    if (!code) return;

    const current = map.get(code);

    if (
      !current ||
      recordPriority(record) >
        recordPriority(current)
    ) {
      map.set(code, record);
    }
  });

  return map;
};

const normalizeStatus = (status) => {
  const value = String(status || "")
    .trim()
    .toUpperCase();

  if (value === "COMPLETED") {
    return "Completed";
  }

  if (value === "LATE") {
    return "Late";
  }

  if (
    value === "PRESENT" ||
    value === "WORKING"
  ) {
    return "Working";
  }

  if (value === "MISSING_CHECKOUT") {
    return "Missing Checkout";
  }

  if (value === "ABSENT") {
    return "Absent";
  }

  if (value === "PAID_LEAVE") {
    return "Paid Leave";
  }

  if (value === "WEEKLY_OFF") {
    return "Weekly Off";
  }

  if (value === "HOLIDAY") {
    return "Holiday";
  }

  return "Pending";
};

const getStatusClass = (status) => {
  switch (status) {
    case "Working":
      return "status-active";

    case "Late":
      return "status-warning";

    case "Completed":
      return "status-success";

    case "Missing Checkout":
      return "status-warning";

    case "Absent":
      return "status-inactive";

    case "Paid Leave":
      return "status-success";

    case "Weekly Off":
      return "status-inactive";

    case "Holiday":
      return "status-success";

    default:
      return "status-inactive";
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const SupervisorAttendance = () => {
  const { user } = useAuth();
  const { selectedFirm } = useFirm();

  const employeeCode = user?.employeeCode;

  const recordedBy =
    user?.email ||
    user?.username ||
    employeeCode ||
    "Supervisor";

  /* =======================================================
     STATE
  ======================================================= */

  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] =
    useState("GENERAL");
  const [shiftsLoading, setShiftsLoading] =
    useState(true);

  const [staff, setStaff] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");

  const [checkedIn, setCheckedIn] =
    useState(false);

  const [checkedOut, setCheckedOut] =
    useState(false);

  const [myCheckIn, setMyCheckIn] =
    useState("--");

  const [myCheckOut, setMyCheckOut] =
    useState("--");

  const [myAttendanceStatus, setMyAttendanceStatus] =
    useState("Pending");

  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    pending: 0,
    absent: 0,
    missingCheckout: 0,
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  /* =======================================================
     MANUAL CHECKOUT MODAL
  ======================================================= */

  const [manualCheckoutEmployee, setManualCheckoutEmployee] =
    useState(null);

  const [manualCheckoutTime, setManualCheckoutTime] =
    useState("");

  const [manualCheckoutNotes, setManualCheckoutNotes] =
    useState("");

  const [manualCheckoutLoading, setManualCheckoutLoading] =
    useState(false);

  /* =======================================================
     LOAD SHIFTS
  ======================================================= */

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setShiftsLoading(true);

        const data = await loadShifts();

        const loadedShifts = Array.isArray(data)
          ? data
          : [];

        setShifts(loadedShifts);

        const generalShift =
          loadedShifts.find(
            (shift) =>
              shift.value === "GENERAL"
          );

        if (generalShift) {
          setSelectedShift("GENERAL");
        } else if (
          loadedShifts.length > 0
        ) {
          setSelectedShift(
            loadedShifts[0].value
          );
        }
      } catch (err) {
        console.error(
          "Failed to load shifts:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Could not load shifts from the server."
        );
      } finally {
        setShiftsLoading(false);
      }
    };

    fetchShifts();
  }, []);

  /* =======================================================
     SELECTED SHIFT DETAILS
  ======================================================= */

  const selectedShiftDetails = useMemo(() => {
    return (
      getShiftDetails(selectedShift) ||
      shifts.find(
        (shift) =>
          shift.value === selectedShift
      ) ||
      null
    );
  }, [selectedShift, shifts]);

  /* =======================================================
     CURRENT SUPERVISOR EMPLOYEE
  ======================================================= */

  const linkedEmployee = useMemo(() => {
    return staff.find(
      (employee) =>
        normalizeEmployeeCode(employee.id) ===
        normalizeEmployeeCode(employeeCode)
    );
  }, [staff, employeeCode]);

  /* =======================================================
     FILTER EMPLOYEE
  ======================================================= */

  const filteredStaff = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return staff.filter((emp) => {
      const employeeName = String(
        emp.name || ""
      ).toLowerCase();

      const employeeId = String(
        emp.id || ""
      ).toLowerCase();

      const searchMatch =
        !searchValue ||
        employeeName.includes(
          searchValue
        ) ||
        employeeId.includes(
          searchValue
        );

      const statusMatch =
        !statusFilter ||
        emp.status === statusFilter;

      return (
        searchMatch &&
        statusMatch
      );
    });
  }, [
    staff,
    search,
    statusFilter,
  ]);

  /* =======================================================
     APPLY ATTENDANCE RECORD
  ======================================================= */

  const applyAttendanceRecord =
    useCallback(
      (record) => {
        if (!record) return;

        const code =
          normalizeEmployeeCode(
            record.employeeCode
          );

        setStaff((current) =>
          current.map((emp) => {
            if (
              normalizeEmployeeCode(
                emp.id
              ) !== code
            ) {
              return emp;
            }

            /*
             * IMPORTANT:
             * Employee Master shift remains
             * the source of truth.
             *
             * Do NOT replace employee.shift
             * with attendance.shift here.
             */
            return {
              ...emp,

              checkIn:
                formatDisplayTime(
                  record.checkInTime
                ),

              checkOut:
                formatDisplayTime(
                  record.checkOutTime
                ),

              status:
                normalizeStatus(
                  record.status
                ),

              attendanceStatus:
                record.status,

              attendanceRecord:
                record,
            };
          })
        );

        if (
          code ===
          normalizeEmployeeCode(
            employeeCode
          )
        ) {
          setMyCheckIn(
            formatDisplayTime(
              record.checkInTime
            )
          );

          setMyCheckOut(
            formatDisplayTime(
              record.checkOutTime
            )
          );

          setCheckedIn(
            Boolean(record.checkInTime)
          );

          setCheckedOut(
            Boolean(record.checkOutTime)
          );

          setMyAttendanceStatus(
            normalizeStatus(
              record.status
            )
          );
        }
      },
      [employeeCode]
    );

  /* =======================================================
     LOAD ATTENDANCE
  ======================================================= */

  const loadAttendance =
    useCallback(async () => {
      if (
        !selectedFirm?.code ||
        !user
      ) {
        return;
      }

      try {
        const requestId =
          Date.now();

        const [
          employeesRes,
          attendanceRes,
          summaryRes,
        ] = await Promise.all([
          api.get("/employees", {
            params: {
              firmCode:
                selectedFirm.code,
              _t: requestId,
            },
          }),

          api.get("/attendance/today", {
            params: {
              firmCode:
                selectedFirm.code,
              _t: requestId,
            },
          }),

          api.get(
            "/attendance/summary",
            {
              params: {
                firmCode:
                  selectedFirm.code,
                _t: requestId,
              },
            }
          ),
        ]);

        /* =================================================
           ACTIVE EMPLOYEES
        ================================================= */

        const activeEmployees =
          (
            employeesRes.data || []
          ).filter(
            (employee) =>
              employee.active !==
                false &&
              String(
                employee.status ||
                  ""
              ).toLowerCase() !==
                "inactive"
          );

        /* =================================================
           TODAY'S ATTENDANCE
        ================================================= */

        const records =
          Array.isArray(
            attendanceRes.data
          )
            ? attendanceRes.data
            : [];

        const recordMap =
          indexLatestRecords(
            records
          );

        /* =================================================
           BUILD EMPLOYEE

           Employee Master SHIFT is the
           source of truth.
        ================================================= */

        const staffData =
          activeEmployees.map(
            (emp) => {
              const employeeCodeValue =
                emp.employeeCode;

              const record =
                recordMap.get(
                  normalizeEmployeeCode(
                    employeeCodeValue
                  )
                );

              /*
               * IMPORTANT:
               * Shift comes from Employee Master.
               *
               * Attendance record.shift is
               * historical snapshot only.
               */
              const employeeShift =
                emp.shift ||
                emp.shiftType ||
                emp.assignedShift ||
                "GENERAL";

              const shiftDetails =
                getShiftDetails(
                  employeeShift
                );

              const hasAttendance =
                Boolean(record);

              return {
                id: employeeCodeValue,

                name:
                  emp.name ||
                  employeeCodeValue,

                department:
                  emp.department ||
                  "--",


                shift:
                  employeeShift,

                expectedIn:
                  shiftDetails?.start ||
                  "09:00",

                expectedOut:
                  shiftDetails?.end ||
                  "18:00",

                checkIn:
                  formatDisplayTime(
                    record?.checkInTime
                  ),

                checkOut:
                  formatDisplayTime(
                    record?.checkOutTime
                  ),

                /*
                 * If there is no attendance
                 * record, employee is Pending.
                 */
                status: hasAttendance
                  ? normalizeStatus(
                      record?.status
                    )
                  : "Pending",

                attendanceStatus:
                  record?.status ||
                  null,

                attendanceRecord:
                  record || null,
              };
            }
          );

        setStaff(staffData);

        /* =================================================
           CURRENT SUPERVISOR ATTENDANCE
        ================================================= */

        const myRecord =
          employeeCode
            ? recordMap.get(
                normalizeEmployeeCode(
                  employeeCode
                )
              )
            : null;

        setCheckedIn(
          Boolean(
            myRecord?.checkInTime
          )
        );

        setCheckedOut(
          Boolean(
            myRecord?.checkOutTime
          )
        );

        setMyCheckIn(
          formatDisplayTime(
            myRecord?.checkInTime
          )
        );

        setMyCheckOut(
          formatDisplayTime(
            myRecord?.checkOutTime
          )
        );

        setMyAttendanceStatus(
          myRecord
            ? normalizeStatus(
                myRecord.status
              )
            : "Pending"
        );

        /*
         * IMPORTANT:
         * Supervisor's current shift also
         * comes from Employee Master.
         */
        const myEmployee =
          activeEmployees.find(
            (employee) =>
              normalizeEmployeeCode(
                employee.employeeCode
              ) ===
              normalizeEmployeeCode(
                employeeCode
              )
          );

        const myEmployeeShift =
          myEmployee?.shift ||
          myEmployee?.shiftType ||
          myEmployee?.assignedShift ||
          "GENERAL";

        setSelectedShift(
          myEmployeeShift
        );

        /* =================================================
           SUMMARY

           No attendance record = Pending
           Explicit ABSENT = Absent
           ================================================= */

        const pendingCount =
          staffData.filter(
            (employee) =>
              employee.status ===
                "Pending"
          ).length;

        const absentCount =
          staffData.filter(
            (employee) =>
              employee.status ===
              "Absent"
          ).length;

        const missingCheckoutCount =
          staffData.filter(
            (employee) =>
              employee.status ===
              "Missing Checkout"
          ).length;

        setSummary({
          present:
            Number(
              summaryRes.data?.present
            ) || 0,

          late:
            Number(
              summaryRes.data?.late
            ) || 0,

          pending:
            pendingCount,

          absent:
            absentCount,

          missingCheckout:
            missingCheckoutCount,
        });

        setError(
          employeeCode
            ? ""
            : "This account is not linked to an employee."
        );
      } catch (err) {
        console.error(
          "Attendance loading error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Could not load attendance."
        );
      }
    }, [
      selectedFirm?.code,
      user,
      employeeCode,
    ]);

  /* =======================================================
     INITIAL LOAD + 30 SECOND REFRESH
  ======================================================= */

  useEffect(() => {
    if (!selectedFirm?.code) {
      return;
    }

    loadAttendance();

    const interval =
      setInterval(
        loadAttendance,
        30000
      );

    return () =>
      clearInterval(interval);
  }, [
    loadAttendance,
    selectedFirm?.code,
  ]);

  /* =======================================================
     GET CURRENT GPS
  ======================================================= */

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!window.isSecureContext) {
        reject(new Error("Location requires HTTPS or localhost."));
        return;
      }
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      // Supervisor location is audit evidence and is not geofence-enforced.
      getRecordedPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        (error) => reject(error)
      );
    });

  /* =======================================================
     SUPERVISOR SELF CHECK-IN
  ======================================================= */

  const handleCheckIn =
    async () => {
      if (!employeeCode) {
        setError(
          "Your login account has no employee code."
        );
        return;
      }

      if (!selectedFirm?.code) {
        setError(
          "Please select a firm before checking in."
        );
        return;
      }

      if (!selectedShift) {
        setError(
          "Employee shift is not configured."
        );
        return;
      }

      if (!linkedEmployee) {
        setError(
          `Your supervisor account is linked to employee code ${employeeCode}, but that employee was not found in the selected firm. Ask an administrator to correct the account's employee link.`
        );
        return;
      }

      if (checkedIn) {
        setError(
          "You are already checked in."
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const location =
          await getCurrentLocation();

        const response =
          await api.post(
            "/attendance/checkin",
            {
              firmCode:
                selectedFirm.code,

              employeeCode:
                employeeCode,

              employeeName:
                linkedEmployee?.name ||
                user?.fullName ||
                user?.username ||
                employeeCode,

              department:
                linkedEmployee?.department ||
                user?.department ||
                "Supervisor",


              /*
               * Employee Master shift.
               */
              shift:
                linkedEmployee?.shift ||
                linkedEmployee?.shiftType ||
                selectedShift ||
                "GENERAL",

              recordedBy,

              latitude:
                location.latitude,

              longitude:
                location.longitude,
              accuracy: location.accuracy,
            }
          );

        applyAttendanceRecord(
          response.data
        );

        await loadAttendance();
      } catch (err) {
        console.error(
          "Supervisor check-in error:",
          err
        );

        setError(getApiErrorMessage(err, "Check-in failed."));
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     SUPERVISOR SELF CHECK-OUT

     Location is recorded for audit and is not geofence-enforced.
  ======================================================= */

  const handleCheckOut =
    async () => {
      if (!employeeCode) {
        setError(
          "Your login account has no employee code."
        );
        return;
      }

      if (!linkedEmployee) {
        setError(
          `Your supervisor account is linked to employee code ${employeeCode}, but that employee was not found in the selected firm. Ask an administrator to correct the account's employee link.`
        );
        return;
      }

      if (!selectedFirm?.code) {
        setError(
          "Please select a firm before checking out."
        );
        return;
      }

      if (!checkedIn) {
        setError(
          "You have not checked in yet."
        );
        return;
      }

      if (checkedOut) {
        setError(
          "You are already checked out."
        );
        return;
      }

      /*
       * Missing checkout must be corrected
       * by Supervisor/Admin manually.
       */
      if (
        myAttendanceStatus ===
        "Missing Checkout"
      ) {
        setError(
          "Your checkout is already marked as missing. Please contact your administrator or supervisor for manual correction."
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const location =
          await getCurrentLocation();

        const response =
          await api.post(
            `/attendance/checkout/${encodeURIComponent(
              employeeCode
            )}`,
            {
              firmCode:
                selectedFirm.code,

              recordedBy,

              latitude:
                location.latitude,

              longitude:
                location.longitude,
              accuracy: location.accuracy,
            }
          );

        applyAttendanceRecord(
          response.data
        );

        await loadAttendance();
      } catch (err) {
        console.error(
          "Supervisor check-out error:",
          err
        );

        setError(getApiErrorMessage(err, "Check-out failed."));
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     SUPERVISOR PUNCHES ANOTHER EMPLOYEE

     The supervisor device location is retained as audit evidence.
  ======================================================= */

  const handlePunchEmployee =
    async (
      employeeId,
      action
    ) => {
      const employee =
        staff.find(
          (emp) =>
            emp.id === employeeId
        );

      if (
        !employee ||
        !selectedFirm?.code
      ) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        let response;

        /* ===============================================
           EMPLOYEE CHECK-IN
        =============================================== */

        if (
          action === "checkin"
        ) {
          if (
            employee.status !==
            "Pending"
          ) {
            setError(
              `${employee.name} cannot be checked in from the current status.`
            );

            setLoading(false);
            return;
          }

          const location =
            await getCurrentLocation();
          

          response =
            await api.post(
              "/attendance/checkin",
              {
                firmCode:
                  selectedFirm.code,

                employeeCode:
                  employee.id,

                employeeName:
                  employee.name,

                department:
                  employee.department,


                /*
                 * Employee Master is the
                 * source of truth.
                 */
                shift:
                  employee.shift ||
                  "GENERAL",

                recordedBy,

                latitude:
                  location.latitude,

                longitude:
                  location.longitude,
                accuracy: location.accuracy,
              }
            );
        }

        /* ===============================================
           NORMAL EMPLOYEE CHECK-OUT
        =============================================== */

        else {
          if (
            employee.status !==
              "Working" &&
            employee.status !==
              "Late"
          ) {
            setError(
              `${employee.name} cannot be checked out from the current status.`
            );

            setLoading(false);
            return;
          }

          const location =
            await getCurrentLocation();

          response =
            await api.post(
              `/attendance/checkout/${encodeURIComponent(
                employee.id
              )}`,
              {
                firmCode:
                  selectedFirm.code,

                recordedBy,

                latitude:
                  location.latitude,

                longitude:
                  location.longitude,
                accuracy: location.accuracy,
              }
            );
        }

        applyAttendanceRecord(
          response.data
        );

        await loadAttendance();
      } catch (err) {
        console.error(
          `Could not ${action} employee:`,
          err
        );

        setError(getApiErrorMessage(err, `Could not ${action} employee.`));
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     OPEN MANUAL CHECKOUT
     
     NO GPS REQUIRED
  ======================================================= */

  const openManualCheckout =
    (employee) => {
      if (!employee) return;

      const record =
        employee.attendanceRecord;

      if (!record) {
        setError(
          "No attendance record exists for this employee."
        );
        return;
      }

      if (!record.checkInTime) {
        setError(
          "Manual checkout cannot be entered because the employee has no check-in time."
        );
        return;
      }

      if (record.checkOutTime) {
        setError(
          "This employee already has a checkout time."
        );
        return;
      }

      setManualCheckoutEmployee(
        employee
      );

      /*
       * Default checkout time = current time.
       * Supervisor can change it.
       */
      setManualCheckoutTime(
        getCurrentTimeForInput()
      );

      setManualCheckoutNotes(
        "Manual checkout correction"
      );

      setError("");
    };

  /* =======================================================
     CLOSE MANUAL CHECKOUT
  ======================================================= */

  const closeManualCheckout =
    () => {
      if (
        manualCheckoutLoading
      ) {
        return;
      }

      setManualCheckoutEmployee(
        null
      );

      setManualCheckoutTime("");
      setManualCheckoutNotes("");
    };

  /* =======================================================
     SAVE MANUAL CHECKOUT

     IMPORTANT:
     No GPS is sent.
  ======================================================= */

  const handleManualCheckout =
    async () => {
      const employee =
        manualCheckoutEmployee;

      if (!employee) {
        return;
      }

      if (!selectedFirm?.code) {
        setError(
          "Please select a firm."
        );
        return;
      }

      if (!manualCheckoutTime) {
        setError(
          "Please select the checkout time."
        );
        return;
      }

      const record =
        employee.attendanceRecord;

      if (!record) {
        setError(
          "Attendance record not found."
        );
        return;
      }

      const checkInTime =
        normalizeTimeForInput(
          record.checkInTime
        );

      if (!checkInTime) {
        setError(
          "Existing check-in time is invalid."
        );
        return;
      }

      /*
       * Basic frontend validation.
       * Backend performs the final validation.
       */
      if (
        manualCheckoutTime <=
        checkInTime
      ) {
        setError(
          "Checkout time must be later than check-in time."
        );
        return;
      }

      setManualCheckoutLoading(
        true
      );

      setError("");

      try {
        const payload = {
          firmCode:
            selectedFirm.code,

          employeeCode:
            employee.id,

          employeeName:
            employee.name,

          department:
            employee.department,


          /*
           * Employee Master shift.
           */
          shift:
            employee.shift ||
            "GENERAL",

          attendanceDate:
            record.attendanceDate ||
            new Date()
              .toISOString()
              .split("T")[0],

          checkInTime:
            checkInTime,

          checkOutTime:
            manualCheckoutTime,

          /*
           * Backend calculates OT from
           * actual check-in/check-out.
           */
          recordedBy,

          status: "COMPLETED",

          notes:
            manualCheckoutNotes.trim() ||
            "Manual checkout correction",
        };

        const response =
          await api.post(
            "/attendance/manual",
            payload
          );

        /*
         * Update UI immediately.
         */
        applyAttendanceRecord(
          response.data
        );

        closeManualCheckout();

        /*
         * Refresh from database.
         */
        await loadAttendance();
      } catch (err) {
        console.error(
          "Manual checkout error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Manual checkout failed."
        );
      } finally {
        setManualCheckoutLoading(
          false
        );
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="employees-page supervisor-attendance-page">

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div className="page-header supervisor-page-header">
        <div>
          <h1>Attendance</h1>

          <p>
            Track your staff's daily attendance
            and manage quick check-ins.
          </p>
        </div>
      </div>

      {/* ===================================================
          MY ATTENDANCE
      =================================================== */}

      <div className="employee-card attendance-panel-card">

        <div className="card-header">
          <h3>
            My Attendance
            {selectedFirm?.code
              ? ` (${selectedFirm.code})`
              : ""}
          </h3>
        </div>

        <div className="attendance-action-panel">

          {/* =============================================
              SHIFT
          ============================================= */}

          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="attendance-shift"
              style={{
                fontWeight: 600,
              }}
            >
              Shift
            </label>

            <select
              id="attendance-shift"
              className="employee-filter-select"
              value={
                selectedShift ||
                "GENERAL"
              }
              onChange={(e) =>
                setSelectedShift(
                  e.target.value
                )
              }
              /*
               * Employee Master is source
               * of truth.
               *
               * Do not allow changing shift
               * after employee data is loaded.
               */
              disabled={
                shiftsLoading ||
                checkedIn ||
                loading ||
                Boolean(
                  linkedEmployee
                )
              }
            >
              {shiftsLoading ? (
                <option value="">
                  Loading shifts...
                </option>
              ) : shifts.length ===
                0 ? (
                <option value="GENERAL">
                  GENERAL
                </option>
              ) : (
                shifts.map(
                  (shift) => (
                    <option
                      key={
                        shift.value
                      }
                      value={
                        shift.value
                      }
                    >
                      {shift.label} (
                      {shift.hours}h)
                    </option>
                  )
                )
              )}
            </select>

            {!shiftsLoading &&
              selectedShiftDetails && (
                <span className="supervisor-shift-time">
                  {
                    selectedShiftDetails.start
                  }{" "}
                  -{" "}
                  {
                    selectedShiftDetails.end
                  }
                </span>
              )}
          </div>

          {/* =============================================
              MY ATTENDANCE SUMMARY
          ============================================= */}

          <div className="employee-summary-grid">

            <div className="summary-card">
              <h3>
                {formatDisplayTime(
                  selectedShiftDetails?.start ||
                    "09:00"
                )}
              </h3>

              <p>
                Expected In
              </p>
            </div>

            <div className="summary-card">
              <h3>
                {formatDisplayTime(
                  selectedShiftDetails?.end ||
                    "18:00"
                )}
              </h3>

              <p>
                Expected Out
              </p>
            </div>

            <div className="summary-card">
              <h3>
                {myCheckIn}
              </h3>

              <p>
                Checked In
              </p>
            </div>

            <div className="summary-card">
              <h3>
                {myCheckOut}
              </h3>

              <p>
                Checked Out
              </p>
            </div>

          </div>

          {/* =============================================
              MY STATUS
          ============================================= */}

          {myAttendanceStatus ===
            "Missing Checkout" && (
            <div
              className="auth-error"
              style={{
                marginBottom: 12,
              }}
            >
              Your shift ended without a
              checkout. Please contact your
              supervisor or administrator for
              manual checkout correction.
            </div>
          )}

          {/* =============================================
              ERROR
          ============================================= */}

          {error && (
            <div
              className="auth-error"
              style={{
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* =============================================
              ACTION BUTTONS
          ============================================= */}

          <div className="quick-action-row">

            <button
              className="primary-button punch-button"
              disabled={
                checkedIn ||
                loading ||
                shiftsLoading ||
                !selectedShift
              }
              onClick={
                handleCheckIn
              }
            >
              {loading
                ? "Processing..."
                : "Check In"}
            </button>

            <button
              className="employee-reset-button punch-button"
              disabled={
                !checkedIn ||
                checkedOut ||
                loading ||
                myAttendanceStatus ===
                  "Missing Checkout"
              }
              onClick={
                handleCheckOut
              }
            >
              {loading
                ? "Processing..."
                : "Check Out"}
            </button>

          </div>
        </div>
      </div>

      {/* ===================================================
          EMPLOYEE SUMMARY
      =================================================== */}

      <div className="employee-summary-grid">

        <div className="summary-card">
          <h3>
            {summary.present}
          </h3>

          <p>Present</p>
        </div>

        <div className="summary-card">
          <h3>
            {summary.absent}
          </h3>

          <p>Absent</p>
        </div>

        <div className="summary-card">
          <h3>
            {summary.late}
          </h3>

          <p>Late</p>
        </div>

        <div className="summary-card">
          <h3>
            {summary.pending}
          </h3>

          <p>Pending</p>
        </div>

        <div className="summary-card">
          <h3>
            {summary.missingCheckout}
          </h3>

          <p>
            Missing Checkout
          </p>
        </div>

      </div>

      {/* ===================================================
          EMPLOYEE TABLE
      =================================================== */}

      <div
        className="employee-card supervisor-table-card"
        style={{
          marginTop: 24,
        }}
      >

        {/* ===============================================
            FILTERS
        =============================================== */}

        <div className="employee-filter">

          <div className="employee-search">
            <span className="material-symbols-outlined">
              search
            </span>

            <input
              placeholder="Search employee..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />
          </div>

          <select
            className="employee-filter-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="">
              All Status
            </option>

            <option value="Working">
              Working
            </option>

            <option value="Late">
              Late
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Missing Checkout">
              Missing Checkout
            </option>

            <option value="Absent">
              Absent
            </option>

            <option value="Paid Leave">
              Paid Leave
            </option>

            <option value="Weekly Off">
              Weekly Off
            </option>

            <option value="Holiday">
              Holiday
            </option>
          </select>

        </div>

        {/* ===============================================
            TABLE
        =============================================== */}

        <div className="employee-table-wrapper">

          <table className="employee-table">

            <thead>
              <tr>
                <th>
                  Employee
                </th>

                <th>
                  Shift
                </th>

                <th>
                  Expected In
                </th>

                <th>
                  Check In
                </th>

                <th>
                  Check Out
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>

              {filteredStaff.map(
                (emp) => {
                  /*
                   * Employee Master shift.
                   */
                  const employeeShift =
                    getShiftDetails(
                      emp.shift
                    );

                  const hasRecord =
                    Boolean(
                      emp.attendanceRecord
                    );

                  const isMissingCheckout =
                    emp.status ===
                    "Missing Checkout";

                  const canNormalCheckout =
                    emp.status ===
                      "Working" ||
                    emp.status ===
                      "Late";

                  return (
                    <tr
                      key={emp.id}
                    >

                      {/* EMPLOYEE */}

                      <td>
                        <strong>
                          {emp.name}
                        </strong>

                        <br />

                        <small>
                          {emp.id}
                        </small>
                      </td>

                      {/* SHIFT */}

                      <td>
                        {employeeShift
                          ?.label ||
                          emp.shift ||
                          "GENERAL"}
                      </td>

                      {/* EXPECTED IN */}

                      <td>
                        {emp.expectedIn}
                      </td>

                      {/* CHECK IN */}

                      <td>
                        {emp.checkIn}
                      </td>

                      {/* CHECK OUT */}

                      <td>
                        {emp.checkOut}
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            emp.status
                          )}`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      {/* ACTION */}

                      <td>

                        {/* =================================
                            NO RECORD = CHECK IN
                        ================================= */}

                        {emp.status ===
                          "Pending" &&
                        !hasRecord ? (
                          <button
                            className="employee-reset-button"
                            disabled={
                              loading
                            }
                            onClick={() =>
                              handlePunchEmployee(
                                emp.id,
                                "checkin"
                              )
                            }
                          >
                            Check In
                          </button>

                        /* =================================
                           MISSING CHECKOUT =
                           MANUAL CHECKOUT
                        ================================= */

                        ) : isMissingCheckout ? (
                          <button
                            className="employee-reset-button"
                            disabled={
                              loading
                            }
                            onClick={() =>
                              openManualCheckout(
                                emp
                              )
                            }
                          >
                            Manual Checkout
                          </button>

                        /* =================================
                           WORKING / LATE =
                           NORMAL GPS CHECKOUT
                        ================================= */

                        ) : canNormalCheckout ? (
                          <button
                            className="employee-reset-button"
                            disabled={
                              loading
                            }
                            onClick={() =>
                              handlePunchEmployee(
                                emp.id,
                                "checkout"
                              )
                            }
                          >
                            Check Out
                          </button>

                        /* =================================
                           COMPLETED
                        ================================= */

                        ) : emp.status ===
                          "Completed" ? (
                          <button
                            className="employee-reset-button"
                            disabled
                          >
                            Completed
                          </button>

                        /* =================================
                           OTHER STATUSES
                        ================================= */

                        ) : (
                          <span>
                            --
                          </span>
                        )}

                      </td>

                    </tr>
                  );
                }
              )}

              {!filteredStaff.length && (
                <tr>
                  <td colSpan="7">
                    No employees found.
                  </td>
                </tr>
              )}

            </tbody>
          </table>

        </div>
      </div>

      {/* ===================================================
          MANUAL CHECKOUT MODAL
      =================================================== */}

      {manualCheckoutEmployee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: 20,
            zIndex: 9999,
          }}
          onClick={
            closeManualCheckout
          }
        >
          <div
            className="employee-card"
            style={{
              width: "100%",
              maxWidth: 480,
              padding: 24,
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div
              className="card-header"
              style={{
                marginBottom: 20,
              }}
            >
              <div>
                <h3>
                  Manual Checkout
                </h3>

                <p
                  style={{
                    marginTop: 4,
                  }}
                >
                  {
                    manualCheckoutEmployee.name
                  }{" "}
                  (
                  {
                    manualCheckoutEmployee.id
                  }
                  )
                </p>
              </div>
            </div>

            {/* WARNING */}

            <div
              className="auth-error"
              style={{
                marginBottom: 16,
              }}
            >
              GPS is not required for manual
              checkout. Enter the actual
              checkout time recorded by the
              supervisor.
            </div>

            {/* CHECK IN */}

            <div
              style={{
                marginBottom: 16,
              }}
            >
              <label
                style={{
                  display:
                    "block",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Check In Time
              </label>

              <input
                type="text"
                value={formatDisplayTime(
                  manualCheckoutEmployee
                    .attendanceRecord
                    ?.checkInTime
                )}
                disabled
                style={{
                  width: "100%",
                }}
              />
            </div>

            {/* CHECKOUT */}

            <div
              style={{
                marginBottom: 16,
              }}
            >
              <label
                htmlFor="manual-checkout-time"
                style={{
                  display:
                    "block",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Actual Check Out Time
              </label>

              <input
                id="manual-checkout-time"
                type="time"
                value={
                  manualCheckoutTime
                }
                onChange={(e) =>
                  setManualCheckoutTime(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                }}
                disabled={
                  manualCheckoutLoading
                }
              />
            </div>

            {/* NOTES */}

            <div
              style={{
                marginBottom: 20,
              }}
            >
              <label
                htmlFor="manual-checkout-notes"
                style={{
                  display:
                    "block",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Notes
              </label>

              <textarea
                id="manual-checkout-notes"
                value={
                  manualCheckoutNotes
                }
                onChange={(e) =>
                  setManualCheckoutNotes(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Enter reason for manual checkout..."
                style={{
                  width: "100%",
                  resize: "vertical",
                }}
                disabled={
                  manualCheckoutLoading
                }
              />
            </div>

            {/* BUTTONS */}

            <div
              className="quick-action-row"
              style={{
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                className="employee-reset-button"
                disabled={
                  manualCheckoutLoading
                }
                onClick={
                  closeManualCheckout
                }
              >
                Cancel
              </button>

              <button
                className="primary-button"
                disabled={
                  manualCheckoutLoading ||
                  !manualCheckoutTime
                }
                onClick={
                  handleManualCheckout
                }
              >
                {manualCheckoutLoading
                  ? "Saving..."
                  : "Save Checkout"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SupervisorAttendance;
