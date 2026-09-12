import api from "../api";

// ============================================================
// ATTENDANCE CONFIG
// ============================================================

export const GRACE_PERIOD_MINUTES = 10;

// Shift timings are now loaded from the backend.
// Do NOT hardcode shift timings here.
export const shifts = {};

// ============================================================
// LOAD SHIFTS FROM BACKEND
// ============================================================

export const loadShifts = async () => {
  try {
    const response = await api.get("/attendance/shifts");

    // Clear existing shifts
    Object.keys(shifts).forEach((key) => delete shifts[key]);

    // Store backend shifts using both value and label
    response.data.forEach((shift) => {
      const shiftDetails = {
        value: shift.value,
        label: shift.label,
        hours: shift.hours,
        start: shift.start,
        end: shift.end,
      };

      shifts[shift.value] = shiftDetails;
      shifts[shift.label] = shiftDetails;
    });

    return response.data;
  } catch (error) {
    console.error("Failed to load shifts:", error);
    throw error;
  }
};
// ============================================================
// GET SHIFT DETAILS
// ============================================================

export const getShiftDetails = (shiftValueOrLabel) => {
  if (!shiftValueOrLabel) return null;

  return shifts[shiftValueOrLabel] || null;
};

// ============================================================
// TIME HELPERS
// ============================================================

export const toMinutes = (time) => {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

export const formatTime = (time) => {
  if (!time) return "-";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
};

export const formatWorkingHours = (minutes) => {
  if (minutes <= 0) return "0 minutes";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours
    ? `${hours}h ${remainingMinutes}m`
    : `${remainingMinutes} minutes`;
};

// ============================================================
// MOCK PUNCH
// ============================================================
// Kept for your existing frontend/mock attendance functionality.
// Shift timings now come from backend-loaded shifts.

export const getMockPunch = (employee, day) => {
  const shiftName =
    employee.id === "EMP002"
      ? "GENERAL"
      : employee.id === "EMP004"
        ? "EIGHT_HOURS"
        : "GENERAL";

  const shift = getShiftDetails(shiftName);

  // Backend shifts must be loaded before using mock data
  if (!shift) {
    console.warn(
      "Shift data has not been loaded. Call loadShifts() before getMockPunch()."
    );

    return {
      status: "",
      shiftName,
      shiftStart: null,
      shiftEnd: null,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  const dayNumber = day.number;

  if (day.date.getDay() === 0) {
    return {
      status: "WO",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP003" && dayNumber % 6 === 0) {
    return {
      status: "A",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP004" && dayNumber % 7 === 0) {
    return {
      status: "PL",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP005" && dayNumber % 5 === 0) {
    return {
      status: "H",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP002" && dayNumber % 11 === 0) {
    return {
      status: "",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: null,
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP004" && dayNumber % 8 === 2) {
    return {
      status: "P",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: "09:25",
      checkOut: "17:20",
      overtime: "",
    };
  }

  if (employee.id === "EMP005" && dayNumber % 9 === 0) {
    return {
      status: "P",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: "09:04",
      checkOut: null,
      overtime: "",
    };
  }

  if (employee.id === "EMP001" && dayNumber % 5 === 2) {
    return {
      status: "P",
      shiftName,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      checkIn: "09:04",
      checkOut: "17:30",
      overtime: "",
    };
  }

  const checkInMinutes =
    employee.id === "EMP002" && dayNumber % 4 === 3
      ? toMinutes(shift.start) + 18
      : employee.id === "EMP003" && dayNumber % 5 === 0
        ? toMinutes(shift.start) - 5
        : toMinutes(shift.start) + (dayNumber % 8 === 0 ? 25 : 4);

  const checkOutMinutes =
    employee.id === "EMP002" && dayNumber % 4 === 3
      ? toMinutes(shift.end) + 2
      : employee.id === "EMP003" && dayNumber % 5 === 0
        ? toMinutes(shift.end) - 30
        : toMinutes(shift.end) + (dayNumber % 6 === 0 ? 15 : 2);

  const checkIn = `${String(Math.floor(checkInMinutes / 60)).padStart(
    2,
    "0"
  )}:${String(checkInMinutes % 60).padStart(2, "0")}`;

  const checkOut = `${String(Math.floor(checkOutMinutes / 60)).padStart(
    2,
    "0"
  )}:${String(checkOutMinutes % 60).padStart(2, "0")}`;

  return {
    status: "P",
    shiftName,
    shiftStart: shift.start,
    shiftEnd: shift.end,
    checkIn,
    checkOut,
    overtime: dayNumber % 6 === 0 ? "1" : "",
  };
};

// ============================================================
// CALCULATE ATTENDANCE
// ============================================================

export const calculateAttendance = (record) => {
  // Backend records contain shift = "GENERAL", "EIGHT_HOURS", etc.
  // Mock records already contain shiftStart / shiftEnd.

  const shiftDetails = getShiftDetails(record.shift);

  const shiftStart =
    record.shiftStart || shiftDetails?.start || null;

  const shiftEnd =
    record.shiftEnd || shiftDetails?.end || null;

  const expectedIn = toMinutes(shiftStart);
  const expectedOutBase = toMinutes(shiftEnd);

  const actualIn = toMinutes(record.checkIn);
  const actualOutBase = toMinutes(record.checkOut);

  const expectedOut =
    expectedOutBase !== null &&
    expectedIn !== null &&
    expectedOutBase <= expectedIn
      ? expectedOutBase + 1440
      : expectedOutBase;

  const actualOut =
    actualOutBase !== null &&
    actualIn !== null &&
    actualOutBase < actualIn
      ? actualOutBase + 1440
      : actualOutBase;

  const lateMinutes = calculateLateMinutes(
    record.checkIn,
    shiftStart
  );

  const earlyMinutes = calculateEarlyMinutes(
    record.checkOut,
    shiftEnd,
    record.checkIn
  );

  const incomplete =
    record.status === "P" &&
    (!record.checkIn || !record.checkOut);

  const workedMinutes =
    actualIn !== null && actualOut !== null
      ? Math.max(0, actualOut - actualIn)
      : 0;

  const status = !record.status
    ? "Not Entered"
    : record.status !== "P"
      ? record.status
      : incomplete
        ? "Incomplete Attendance"
        : lateMinutes && earlyMinutes
          ? "Late + Early Checkout"
          : lateMinutes
            ? "Late Check-in"
            : earlyMinutes
              ? "Early Checkout"
              : "Present";

  return {
    ...record,

    shiftStart,
    shiftEnd,

    lateMinutes,
    earlyMinutes,
    incomplete,
    workedMinutes,

    statusLabel: status,

    checkInLabel: formatTime(record.checkIn),
    checkOutLabel: formatTime(record.checkOut),

    lateLabel: formatWorkingHours(lateMinutes),
    earlyLabel: formatWorkingHours(earlyMinutes),

    workingHours: formatWorkingHours(workedMinutes),
  };
};

// ============================================================
// LATE CALCULATION
// ============================================================

export const calculateLateMinutes = (
  actualCheckIn,
  expectedCheckIn
) => {
  const actual = toMinutes(actualCheckIn);
  const expected = toMinutes(expectedCheckIn);

  return actual === null || expected === null
    ? 0
    : Math.max(0, actual - expected - GRACE_PERIOD_MINUTES);
};

// ============================================================
// EARLY CHECKOUT CALCULATION
// ============================================================

export const calculateEarlyMinutes = (
  actualCheckOut,
  expectedCheckOut,
  actualCheckIn
) => {
  const actualBase = toMinutes(actualCheckOut);
  const expectedBase = toMinutes(expectedCheckOut);
  const checkIn = toMinutes(actualCheckIn);

  if (actualBase === null || expectedBase === null) {
    return 0;
  }

  const expected =
    checkIn !== null && expectedBase <= checkIn
      ? expectedBase + 1440
      : expectedBase;

  const actual =
    checkIn !== null && actualBase < checkIn
      ? actualBase + 1440
      : actualBase;

  return Math.max(
    0,
    expected - GRACE_PERIOD_MINUTES - actual
  );
};

// ============================================================
// WORKING MINUTES
// ============================================================

export const calculateWorkingMinutes = (
  actualCheckIn,
  actualCheckOut
) => {
  const checkIn = toMinutes(actualCheckIn);
  const checkOutBase = toMinutes(actualCheckOut);

  if (checkIn === null || checkOutBase === null) {
    return 0;
  }

  const checkOut =
    checkOutBase < checkIn
      ? checkOutBase + 1440
      : checkOutBase;

  return Math.max(0, checkOut - checkIn);
};

// ============================================================
// ATTENDANCE FLAG
// ============================================================

export const getAttendanceFlag = (record) =>
  calculateAttendance(record).statusLabel;