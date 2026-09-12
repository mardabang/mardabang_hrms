export function registrationPayload(form) {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    role: form.role,
    employeeCode: form.role === "INPUTER" ? form.employeeCode.trim() : null,
    ...(form.role === "ADMIN" ? { password: form.password } : {}),
  };
}

export function validateRegistration(form) {
  if (form.fullName.trim().length < 2) return "Enter a full name with at least 2 characters.";
  if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return "Enter a valid 10-digit Indian mobile number without +91.";
  if (form.role === "INPUTER" && !form.employeeCode.trim()) return "Enter an existing employee code for the supervisor.";
  if (form.role === "ADMIN") {
    if (form.password.length < 12 || form.password.length > 128) return "Admin passwords must contain 12–128 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
  }
  return "";
}
