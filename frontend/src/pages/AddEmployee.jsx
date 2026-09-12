import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addEmployee, downloadEmployeeDocument, getEmployeeById, hydrateEmployees, updateEmployee } from "../data/employees";
import { addActivity } from "../data/activityLog";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import api from "../api/axios";

const today = new Date().toISOString().slice(0, 10);
const maxPdfSize = 5 * 1024 * 1024;

const initialForm = {
  employeeCode: "",
  name: "",
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  employmentType: "",
  address: "",
  pfAccountNumber: "",
  esiAccountNumber: "",
  profilePhoto: null,
  profilePhotoName: "",
  firmId: null,
  email: "",
  department: "",
  contact: "",
  designation: "",
  joiningDate: "",
  wageType: "Monthly",
  monthlySalary: "",
  paymentMode: "Bank",
  shiftLength: "8",
  otStartsAfter: "8",
  otRate: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  aadharNumber: "",
  aadharFile: null,
  aadharDocumentName: "",
  panNumber: "",
  panFile: null,
  panDocumentName: "",
  schemes: [],
  active: true,
};

const departments = ["Engineering", "HR", "Production", "Finance", "Maintenance", "Sales", "Administration"];
const designations = ["Software Engineer", "Senior Developer", "HR Executive", "Production Supervisor", "Accountant", "Maintenance Technician", "Manager", "Operator"];
const statutorySchemes = [
  { id: 1, name: "PF", employee: 12, employer: 12 },
  { id: 2, name: "ESIC", employee: 0.75, employer: 3.25 },
];

const RequiredMark = () => <span className="required-mark" aria-hidden="true">*</span>;
const FieldError = ({ id, message }) => message ? <span id={id} className="form-field-error" role="alert">{message}</span> : null;

const AddEmployee = () => {
  const { user } = useAuth();
  const { selectedFirm } = useFirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) {
      setFormData(initialForm);
      return;
    }
    const loadEmployee = async () => {
      await hydrateEmployees();
      const employee = id ? getEmployeeById(id) : null;

      if (isEditMode && !employee) {
        navigate("/employees", { replace: true });
        return;
      }

      const selectedSchemeNames = String(employee.statutorySchemes || "").split(",").map((value) => value.trim()).filter(Boolean);
      setFormData({
        employeeCode: employee.employeeCode || employee.id || "",
        name: employee.name || "",
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        gender: employee.gender || "",
        dateOfBirth: employee.dateOfBirth || "",
        employmentType: employee.employmentType || "",
        address: employee.address || "",
        pfAccountNumber: employee.pfAccountNumber || "",
        esiAccountNumber: employee.esiAccountNumber || "",
        profilePhoto: null,
        profilePhotoName: employee.profilePhotoName || "",
        firmId: employee.firmId,
        email: employee.email || "",
        department: employee.department || "",
        contact: employee.contact || "",
        designation: employee.designation || "",
        joiningDate: employee.joiningDate || "",
        wageType: employee.wageType || "Monthly",
        monthlySalary: employee.monthlySalary ?? "",
        paymentMode: employee.paymentMode || "Bank",
        shiftLength: String(employee.shiftLength ?? 8),
        otStartsAfter: String(employee.otStartsAfter ?? 8),
        otRate: employee.otRate ?? "",
        accountNumber: employee.accountNumber || "",
        ifscCode: employee.ifscCode || "",
        bankName: employee.bankName || "",
        aadharNumber: employee.aadharNumber || "",
        aadharFile: null,
        aadharDocumentName: employee.hasAadharDocument ? "Document on file" : "",
        panNumber: employee.panNumber || "",
        panFile: null,
        panDocumentName: employee.hasPanDocument ? "Document on file" : "",
        schemes: statutorySchemes.filter((scheme) => selectedSchemeNames.includes(scheme.name)).map((scheme) => scheme.id),
        active: employee.active !== false && employee.status !== "Inactive",
      });
    };

    loadEmployee();
  }, [id, isEditMode, navigate]);

  const validateForm = () => {
    const nextErrors = {};
    const code = formData.employeeCode.trim();
    const name = formData.name.trim();
    const salary = Number(formData.monthlySalary);
    const otRate = formData.otRate === "" ? null : Number(formData.otRate);

    if (!code) nextErrors.employeeCode = "Employee code is required.";
    else if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(code)) nextErrors.employeeCode = "Use 3–20 uppercase letters, numbers, or hyphens.";

    if (!name) nextErrors.name = "Employee name is required.";
    else if (name.length < 2 || name.length > 100) nextErrors.name = "Name must contain 2–100 characters.";
    else if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) nextErrors.name = "Enter a valid employee name.";

    for (const field of ["firstName", "lastName"]) {
      if (formData[field].trim() && (!/^[\p{L}][\p{L} .'-]*$/u.test(formData[field].trim()) || formData[field].trim().length > 100)) nextErrors[field] = "Enter a valid name, up to 100 characters.";
    }
    if (formData.dateOfBirth && formData.dateOfBirth >= today) nextErrors.dateOfBirth = "Date of birth must be before today.";
    else if (formData.dateOfBirth && formData.joiningDate && formData.dateOfBirth >= formData.joiningDate) nextErrors.dateOfBirth = "Date of birth must be before the joining date.";
    if (!isEditMode && user?.role === "ADMIN" && !selectedFirm?.id) nextErrors.firmId = "Select a firm before adding an employee.";
    if (formData.profilePhoto && (formData.profilePhoto.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(formData.profilePhoto.type))) nextErrors.profilePhoto = "Choose a JPG, PNG or WEBP image up to 2 MB.";

    if (!formData.designation) nextErrors.designation = "Designation is required.";
    if (!formData.department) nextErrors.department = "Department is required.";
    if (!formData.joiningDate) nextErrors.joiningDate = "Joining date is required.";
    else if (formData.joiningDate > today) nextErrors.joiningDate = "Joining date cannot be in the future.";

    if (!formData.contact) nextErrors.contact = "Mobile number is required.";
    else if (!/^[6-9]\d{9}$/.test(formData.contact)) nextErrors.contact = "Enter a valid 10-digit Indian mobile number.";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = "Enter a valid email address.";

    if (!Number.isFinite(salary) || salary <= 0) nextErrors.monthlySalary = "Enter a salary greater than zero.";
    else if (salary > 99999999.99) nextErrors.monthlySalary = "Salary must be below ₹10 crore.";
    if (otRate !== null && (!Number.isFinite(otRate) || otRate < 0)) nextErrors.otRate = "OT rate cannot be negative.";

    if (formData.paymentMode === "Bank") {
      if (!/^\d{9,18}$/.test(formData.accountNumber)) nextErrors.accountNumber = "Enter a 9–18 digit account number.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) nextErrors.ifscCode = "Enter a valid IFSC code, for example SBIN0001234.";
      if (formData.bankName.trim().length < 2) nextErrors.bankName = "Bank name is required for bank transfer.";
    }

    if (!formData.aadharNumber) nextErrors.aadharNumber = "Aadhaar number is required.";
    else if (!/^\d{12}$/.test(formData.aadharNumber)) nextErrors.aadharNumber = "Aadhaar number must contain exactly 12 digits.";
    if (!formData.panNumber) nextErrors.panNumber = "PAN number is required.";
    else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(formData.panNumber)) nextErrors.panNumber = "Enter a valid PAN, for example ABCDE1234F.";

    const validatePdf = (file, existingName, field, label) => {
      if (!file && !existingName) nextErrors[field] = `${label} PDF is required.`;
      else if (file && file.size > maxPdfSize) nextErrors[field] = `${label} PDF must not exceed 5 MB.`;
      else if (file && ((file.type && file.type !== "application/pdf") || !file.name.toLowerCase().endsWith(".pdf"))) nextErrors[field] = `${label} document must be a PDF file.`;
    };
    validatePdf(formData.aadharFile, formData.aadharDocumentName, "aadharFile", "Aadhaar");
    validatePdf(formData.panFile, formData.panDocumentName, "panFile", "PAN");

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue = type === "checkbox" ? checked : value;
    if (["employeeCode", "ifscCode", "panNumber"].includes(name)) nextValue = value.toUpperCase();
    if (["contact", "accountNumber", "aadharNumber"].includes(name)) nextValue = value.replace(/\D/g, "");

    setFormData((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  };

  const handleSchemeChange = (schemeId) => {
    setFormData((current) => ({
      ...current,
      schemes: current.schemes.includes(schemeId)
        ? current.schemes.filter((item) => item !== schemeId)
        : [...current.schemes, schemeId],
    }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;
    setFormData((current) => ({ ...current, [name]: file }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  };

  const handleDocumentDownload = async (documentType, fileName) => {
    try {
      await downloadEmployeeDocument(formData.employeeCode, documentType, fileName);
    } catch {
      setSubmitError("The document could not be downloaded. Please try again.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      setSubmitError("Please correct the highlighted fields before saving.");
      window.requestAnimationFrame(() => document.querySelector("[aria-invalid='true']")?.focus());
      return;
    }

    const payload = {
      employeeCode: formData.employeeCode.trim(),
      name: formData.name.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || null,
      employmentType: formData.employmentType.trim(),
      address: formData.address.trim(),
      pfAccountNumber: formData.pfAccountNumber.trim(),
      esiAccountNumber: formData.esiAccountNumber.trim(),
      firmId: isEditMode ? formData.firmId : selectedFirm?.id,
      email: formData.email.trim(),
      department: formData.department,
      contact: formData.contact,
      designation: formData.designation,
      joiningDate: formData.joiningDate,
      status: formData.active ? "Active" : "Inactive",
      active: formData.active,
      wageType: formData.wageType,
      monthlySalary: Number(formData.monthlySalary),
      paymentMode: formData.paymentMode,
      shiftLength: Number(formData.shiftLength),
      otStartsAfter: Number(formData.otStartsAfter),
      otRate: formData.otRate === "" ? 0 : Number(formData.otRate),
      accountNumber: formData.paymentMode === "Bank" ? formData.accountNumber : "",
      ifscCode: formData.paymentMode === "Bank" ? formData.ifscCode : "",
      bankName: formData.paymentMode === "Bank" ? formData.bankName.trim() : "",
      aadharNumber: formData.aadharNumber,
      panNumber: formData.panNumber,
      statutorySchemes: statutorySchemes.filter((scheme) => formData.schemes.includes(scheme.id)).map((scheme) => scheme.name).join(","),
    };

    setSubmitting(true);
    setSubmitError("");
    let employeeSaved = false;
    try {
  if (isEditMode) {
    await updateEmployee(id, payload, { aadharDocument: formData.aadharFile, panDocument: formData.panFile });
    addActivity({ icon: "edit", title: "Employee profile updated", description: `${payload.name} (${payload.employeeCode}) details were updated.`, path: "/employees" });
  } else if (user?.role === "SUPERVISOR") {
    // Supervisor path: creates Employee HR record + linked login account together
    const response = await api.post("/supervisor/employees", { employee: payload });
    addActivity({ icon: "person_add", title: "New employee added", description: `${payload.name} (${payload.employeeCode}) was added.`, path: "/employees" });
    alert(`Employee created. Temporary password: ${response.data.tempPassword}\n\nShare this with the employee — it won't be shown again.`);
  } else {
    // Admin path: existing behavior, unchanged
    await addEmployee(payload, { aadharDocument: formData.aadharFile, panDocument: formData.panFile });
    addActivity({ icon: "person_add", title: "New employee added", description: `${payload.name} (${payload.employeeCode}) was added.`, path: "/employees" });
  }
  employeeSaved = true;
  if (formData.profilePhoto && user?.role === "ADMIN") {
    const photoData = new FormData();
    photoData.append("photo", formData.profilePhoto);
    await api.post(`/employees/code/${encodeURIComponent(payload.employeeCode)}/photo`, photoData);
  }
  navigate("/employees");
} catch (error) {
      const responseMessage = typeof error?.response?.data === "string" ? error.response.data : error?.response?.data?.message;
      if (employeeSaved) {
        setSubmitError(`Employee details were saved, but the photo was not uploaded. ${responseMessage || "Please select the photo and try again."}`);
        if (!isEditMode) navigate(`/employees/${encodeURIComponent(payload.employeeCode)}/edit`, { replace: true });
      } else {
        setSubmitError(responseMessage || error.message || "Employee could not be saved. Check the details and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputState = (field) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `${field}-error` : undefined });

  return (
    <div className="employee-form-page">
      <div className="page-header">
        <div><h1>{isEditMode ? "Edit Employee" : "Add Employee"}</h1><p>{isEditMode ? "Update employee information and records." : "Create a new employee profile."}</p></div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/employees")}><span className="material-symbols-outlined">arrow_back</span>Back</button>
      </div>

      <form onSubmit={handleSubmit} className="employee-form-card" noValidate>
        <p className="required-note"><RequiredMark /> Required fields</p>
        {!isEditMode && <p className="required-note">Firm: {selectedFirm ? `${selectedFirm.code} · ${selectedFirm.name || ""}` : "Select a firm in the top bar"}</p>}
        <FieldError id="firmId-error" message={errors.firmId} />

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">person</span><div><h3>Basic Details</h3><p>Enter the employee’s official information.</p></div></div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="employeeCode">Employee Code <RequiredMark /></label><input id="employeeCode" name="employeeCode" value={formData.employeeCode} onChange={handleChange} maxLength={20} required disabled={isEditMode} {...inputState("employeeCode")} /><small>{isEditMode ? "Employee code cannot be changed after creation." : "Enter the employee code assigned by your organization."}</small><FieldError id="employeeCode-error" message={errors.employeeCode} /></div>
            <div className="form-group"><label htmlFor="name">Employee Name <RequiredMark /></label><input id="name" name="name" value={formData.name} onChange={handleChange} minLength={2} maxLength={100} required autoComplete="name" {...inputState("name")} /><FieldError id="name-error" message={errors.name} /></div>
            <div className="form-group"><label htmlFor="designation">Designation <RequiredMark /></label><select id="designation" name="designation" value={formData.designation} onChange={handleChange} required {...inputState("designation")}><option value="">Select Designation</option>{designations.map((designation) => <option key={designation} value={designation}>{designation}</option>)}</select><FieldError id="designation-error" message={errors.designation} /></div>
            <div className="form-group"><label htmlFor="department">Department <RequiredMark /></label><select id="department" name="department" value={formData.department} onChange={handleChange} required {...inputState("department")}><option value="">Select Department</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select><FieldError id="department-error" message={errors.department} /></div>
            <div className="form-group"><label htmlFor="contact">Mobile Number <RequiredMark /></label><input id="contact" type="tel" inputMode="numeric" name="contact" value={formData.contact} onChange={handleChange} minLength={10} maxLength={10} required autoComplete="tel" placeholder="10-digit mobile number" {...inputState("contact")} /><FieldError id="contact-error" message={errors.contact} /></div>
            <div className="form-group"><label htmlFor="email">Email Address <span className="optional-label">Optional</span></label><input id="email" type="email" name="email" value={formData.email} onChange={handleChange} maxLength={150} autoComplete="email" placeholder="employee@example.com" {...inputState("email")} /><FieldError id="email-error" message={errors.email} /></div>
            <div className="form-group"><label htmlFor="joiningDate">Joining Date <RequiredMark /></label><input id="joiningDate" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} max={today} required {...inputState("joiningDate")} /><FieldError id="joiningDate-error" message={errors.joiningDate} /></div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">payments</span><div><h3>Salary</h3><p>Configure salary, payment, shift, and overtime.</p></div></div>
          <div className="form-grid">
            <fieldset className="form-group form-fieldset"><legend>Wage Type <RequiredMark /></legend><div className="radio-group"><label><input type="radio" name="wageType" value="Monthly" checked={formData.wageType === "Monthly"} onChange={handleChange} />Monthly Salary</label><label><input type="radio" name="wageType" value="Daily" checked={formData.wageType === "Daily"} onChange={handleChange} />Daily Wage</label></div></fieldset>
            <div className="form-group"><label htmlFor="monthlySalary">{formData.wageType === "Daily" ? "Daily Wage" : "Monthly Salary"} (₹) <RequiredMark /></label><input id="monthlySalary" type="number" inputMode="decimal" name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} min="0.01" max="99999999.99" step="0.01" required {...inputState("monthlySalary")} /><FieldError id="monthlySalary-error" message={errors.monthlySalary} /></div>
            <fieldset className="form-group form-fieldset"><legend>Payment Mode <RequiredMark /></legend><div className="radio-group"><label><input type="radio" name="paymentMode" value="Bank" checked={formData.paymentMode === "Bank"} onChange={handleChange} />Bank Transfer / Online</label><label><input type="radio" name="paymentMode" value="Cash" checked={formData.paymentMode === "Cash"} onChange={handleChange} />Cash</label></div></fieldset>
            <div className="form-group"><label htmlFor="shiftLength">Standard Shift Length <RequiredMark /></label><select id="shiftLength" name="shiftLength" value={formData.shiftLength} onChange={handleChange}><option value="8">8 Hours</option><option value="12">12 Hours</option></select></div>
            <div className="form-group"><label htmlFor="otStartsAfter">OT Starts After <RequiredMark /></label><select id="otStartsAfter" name="otStartsAfter" value={formData.otStartsAfter} onChange={handleChange}><option value="8">8 Hours Worked</option><option value="12">12 Hours Worked</option></select></div>
            <div className="form-group"><label htmlFor="otRate">OT Rate per Hour (₹) <span className="optional-label">Optional</span></label><input id="otRate" type="number" inputMode="decimal" name="otRate" value={formData.otRate} onChange={handleChange} min="0" max="999999.99" step="0.01" {...inputState("otRate")} /><FieldError id="otRate-error" message={errors.otRate} /></div>
          </div>
        </div>

        <div className={`form-section ${formData.paymentMode !== "Bank" ? "form-section-disabled" : ""}`}>
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">account_balance</span><div><h3>Bank Details</h3><p>{formData.paymentMode === "Bank" ? "Required for Bank Transfer / Online." : "Not required when payment mode is Cash."}</p></div></div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="accountNumber">Account Number {formData.paymentMode === "Bank" && <RequiredMark />}</label><input id="accountNumber" name="accountNumber" inputMode="numeric" value={formData.accountNumber} onChange={handleChange} minLength={9} maxLength={18} required={formData.paymentMode === "Bank"} disabled={formData.paymentMode !== "Bank"} autoComplete="off" {...inputState("accountNumber")} /><FieldError id="accountNumber-error" message={errors.accountNumber} /></div>
            <div className="form-group"><label htmlFor="ifscCode">IFSC Code {formData.paymentMode === "Bank" && <RequiredMark />}</label><input id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} minLength={11} maxLength={11} required={formData.paymentMode === "Bank"} disabled={formData.paymentMode !== "Bank"} placeholder="SBIN0001234" {...inputState("ifscCode")} /><FieldError id="ifscCode-error" message={errors.ifscCode} /></div>
            <div className="form-group"><label htmlFor="bankName">Bank Name {formData.paymentMode === "Bank" && <RequiredMark />}</label><input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} minLength={2} maxLength={100} required={formData.paymentMode === "Bank"} disabled={formData.paymentMode !== "Bank"} autoComplete="organization" {...inputState("bankName")} /><FieldError id="bankName-error" message={errors.bankName} /></div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">person_book</span><div><h3>Personal and Employment Details</h3><p>Add the employee’s personal information and employment type.</p></div></div>
          <div className="form-grid">
            {[['firstName', 'First Name', 'given-name'], ['lastName', 'Last Name', 'family-name']].map(([field, label, autocomplete]) => <div className="form-group" key={field}><label htmlFor={field}>{label}</label><input id={field} name={field} value={formData[field]} onChange={handleChange} maxLength={100} autoComplete={autocomplete} {...inputState(field)} /><FieldError id={`${field}-error`} message={errors[field]} /></div>)}
            <div className="form-group"><label htmlFor="gender">Gender</label><select id="gender" name="gender" value={formData.gender} onChange={handleChange}><option value="">Select Gender</option>{["Male", "Female", "Other", "Prefer not to say"].map(value => <option key={value}>{value}</option>)}{formData.gender && !["Male", "Female", "Other", "Prefer not to say"].includes(formData.gender) && <option value={formData.gender}>{formData.gender}</option>}</select></div>
            <div className="form-group"><label htmlFor="dateOfBirth">Date of Birth</label><input id="dateOfBirth" name="dateOfBirth" type="date" max={today} value={formData.dateOfBirth} onChange={handleChange} autoComplete="bday" {...inputState("dateOfBirth")} /><FieldError id="dateOfBirth-error" message={errors.dateOfBirth} /></div>
            <div className="form-group"><label htmlFor="employmentType">Employment Type</label><input id="employmentType" name="employmentType" list="employment-types" maxLength={100} value={formData.employmentType} onChange={handleChange} placeholder="Select or enter employment type" /><datalist id="employment-types">{["Permanent", "Contract", "Temporary", "Apprentice", "Part-time"].map(value => <option value={value} key={value} />)}</datalist></div>
            <div className="form-group"><label htmlFor="address">Address</label><textarea id="address" name="address" rows={3} maxLength={255} value={formData.address} onChange={handleChange} autoComplete="street-address" /></div>
            {user?.role === "ADMIN" && <div className="form-group"><label htmlFor="profilePhoto">Profile Photo</label><input id="profilePhoto" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} {...inputState("profilePhoto")} /><small>JPG, PNG or WEBP, up to 2 MB.</small>{formData.profilePhotoName && <small>Current photo: {formData.profilePhotoName}</small>}<FieldError id="profilePhoto-error" message={errors.profilePhoto} /></div>}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">verified_user</span><div><h3>KYC Details</h3><p>Aadhaar and PAN numbers and their PDF documents are required. Maximum file size: 5 MB each.</p></div></div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="aadharNumber">Aadhaar Number <RequiredMark /></label><input id="aadharNumber" name="aadharNumber" inputMode="numeric" value={formData.aadharNumber} onChange={handleChange} minLength={12} maxLength={12} required placeholder="12 digits" {...inputState("aadharNumber")} /><FieldError id="aadharNumber-error" message={errors.aadharNumber} /></div>
            <div className="form-group"><label htmlFor="panNumber">PAN Number <RequiredMark /></label><input id="panNumber" name="panNumber" value={formData.panNumber} onChange={handleChange} minLength={10} maxLength={10} required placeholder="ABCDE1234F" {...inputState("panNumber")} /><FieldError id="panNumber-error" message={errors.panNumber} /></div>
            <div className="form-group">
              <label htmlFor="aadharFile">Aadhaar Document (PDF) <RequiredMark /></label>
              <input id="aadharFile" className="kyc-file-input" type="file" name="aadharFile" accept="application/pdf,.pdf" required={!formData.aadharDocumentName} onChange={handleFileChange} aria-invalid={Boolean(errors.aadharFile)} aria-describedby={errors.aadharFile ? "aadharFile-error" : undefined} />
              {formData.aadharDocumentName && <div className="existing-document"><span>Current document is on file</span><button type="button" onClick={() => handleDocumentDownload("aadhaar", "aadhaar-document.pdf")}>Download</button></div>}
              <FieldError id="aadharFile-error" message={errors.aadharFile} />
            </div>
            <div className="form-group">
              <label htmlFor="panFile">PAN Document (PDF) <RequiredMark /></label>
              <input id="panFile" className="kyc-file-input" type="file" name="panFile" accept="application/pdf,.pdf" required={!formData.panDocumentName} onChange={handleFileChange} aria-invalid={Boolean(errors.panFile)} aria-describedby={errors.panFile ? "panFile-error" : undefined} />
              {formData.panDocumentName && <div className="existing-document"><span>Current document is on file</span><button type="button" onClick={() => handleDocumentDownload("pan", "pan-document.pdf")}>Download</button></div>}
              <FieldError id="panFile-error" message={errors.panFile} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">account_balance_wallet</span><div><h3>Statutory Schemes</h3><p>Select schemes applicable to this employee.</p></div></div>
          <div className="checkbox-grid">{statutorySchemes.map((scheme) => <label key={scheme.id} className="checkbox-card"><input type="checkbox" checked={formData.schemes.includes(scheme.id)} onChange={() => handleSchemeChange(scheme.id)} /><div><strong>{scheme.name}</strong><span>Employee {scheme.employee}% / Employer {scheme.employer}%</span></div></label>)}</div>
          <div className="form-grid">
            <div className="form-group"><label htmlFor="pfAccountNumber">PF Account Number</label><input id="pfAccountNumber" name="pfAccountNumber" maxLength={50} value={formData.pfAccountNumber} onChange={handleChange} /></div>
            <div className="form-group"><label htmlFor="esiAccountNumber">ESI Account Number</label><input id="esiAccountNumber" name="esiAccountNumber" maxLength={50} value={formData.esiAccountNumber} onChange={handleChange} /></div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title"><span className="material-symbols-outlined section-icon">toggle_on</span><div><h3>Employee Status</h3><p>Inactive employees are excluded from current attendance calculations.</p></div></div>
          <label className="switch-row"><input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />Active Employee</label>
        </div>

        {submitError && <div className="form-submit-error" role="alert">{submitError}</div>}
        <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => navigate("/employees")} disabled={submitting}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEditMode ? "Update Employee" : "Save Employee"}</button></div>
      </form>
    </div>
  );
};

export default AddEmployee;
