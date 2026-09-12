export function getEmployeeUser(user) {
  return user?.role === "EMPLOYEE" ? user : null;
}

// An employee's firm comes from their account, never from the admin's selection.
export function getEmployeeFirm(user) {
  if (!getEmployeeUser(user)) return null;
  const value = user.firm || user.firmCode ||
    (Array.isArray(user.firms) && user.firms.length === 1 ? user.firms[0] : null);
  if (!value) return null;
  if (typeof value === "string") return { code: value, name: user.firmName || "" };
  return value.code ? { ...value, name: value.name || "" } : null;
}

export function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function belongsToFirm(employee, firm) {
  if (!firm) return false;
  if (employee.firmCode) return employee.firmCode === firm.code;
  if (employee.firm?.code) return employee.firm.code === firm.code;
  return employee.firmId != null && firm.id != null && String(employee.firmId) === String(firm.id);
}

export function leaveDays(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 0;
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (new Date(start).toISOString().slice(0, 10) !== from || new Date(end).toISOString().slice(0, 10) !== to) return 0;
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

export function validateLeave(form, currentDate = localDate()) {
  if (!form.from || !form.to) return "Please choose your leave dates.";
  if (!leaveDays(form.from, form.to)) return "The end date must be on or after the start date.";
  if (form.from < currentDate) return "Please choose today or a future date.";
  if (!form.reason.trim()) return "Please enter a reason for your leave.";
  return "";
}
