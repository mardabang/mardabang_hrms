export function registrationPayload(form) {
  return {
    fullName: (form.fullName || "").trim(),
    email: (form.email || "").trim(),
    mobile: (form.mobile || "").trim(),

    role: form.role,

    employeeCode: null,

    loginId: (form.role === "ADMIN" ? form.email || "" : form.mobile || "").trim(),

    firmCode:
      form.role === "INPUTER"
        ? (form.firmCode || "").trim()
        : null,

    password: form.password || "",
  };
}

export function validateRegistration(form) {
  if ((form.fullName || "").trim().length < 2) {
    return "Enter a valid full name.";
  }

  if (!(form.email || "").trim()) {
    return "Enter an email address.";
  }

  if (!/^[6-9]\d{9}$/.test((form.mobile || "").trim())) {
    return "Enter a valid 10-digit Indian mobile number.";
  }

  if (form.role === "INPUTER" && !(form.firmCode || "").trim()) {
    return "Please select a firm for the Supervisor.";
  }

  if (
    (form.password || "").length < 12 ||
    (form.password || "").length > 128
  ) {
    return "Password must be between 12 and 128 characters.";
  }

  if ((form.password || "") !== (form.confirmPassword || "")) {
    return "Passwords do not match.";
  }

  return "";
}
