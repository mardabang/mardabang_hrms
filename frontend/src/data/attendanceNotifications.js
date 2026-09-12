export const buildAttendanceNotifications = (summary = {}, attendanceRecords = []) => {
  const notifications = [];
  const incomplete = attendanceRecords.filter((record) => record.checkInTime && !record.checkOutTime).length;

  if (summary.notMarked > 0) {
    notifications.push({
      id: "not-marked",
      type: "warning",
      icon: "warning",
      label: "Action required",
      message: `${summary.notMarked} employee attendance record${summary.notMarked === 1 ? " is" : "s are"} not marked today.`,
      path: "/attendance",
      action: "Review",
    });
  }
  if (incomplete > 0) {
    notifications.push({
      id: "incomplete",
      type: "notice",
      icon: "info",
      label: "Incomplete attendance",
      message: `${incomplete} checked-in employee${incomplete === 1 ? " has" : "s have"} not checked out yet.`,
      path: "/attendance",
      action: "Review",
    });
  }
  if (!notifications.length) {
    notifications.push({
      id: "complete",
      type: "notice",
      icon: "check_circle",
      label: "Attendance up to date",
      message: "No attendance issues require attention today.",
      path: "/attendance",
      action: "View",
    });
  }

  return notifications;
};
