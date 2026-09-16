import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { hydrateEmployees, getEmployeeById, getEmployees } from "../data/employees";
import PhotoViewerModal from "../components/PhotoViewerModal";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=Employee&background=0f172a&color=fff&size=128";

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const displayValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Not provided";
  }
  return String(value);
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "Not provided";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const toDisplayName = (employee) => {
  if (employee?.name) return employee.name;
  if (employee?.firstName || employee?.lastName) return [employee.firstName, employee.lastName].filter(Boolean).join(" ");
  return "Employee";
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_AVATAR);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  // Self-editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [formData, setFormData] = useState({
    contact: "",
    address: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  const isSelfMode = !id;

  const loadEmployee = async () => {
    try {
      setLoading(true);
      setError("");

      let detailData;

      if (isSelfMode) {
        const details = await api.get(`/me/profile`);
        detailData = details.data;
        setEmployee(detailData);
      } else {
        await hydrateEmployees();
        const current = getEmployeeById(id) || getEmployees().find((item) => item.employeeCode === id || item.id === id);
        if (!current) {
          setError("Employee not found.");
          setEmployee(null);
          return;
        }
        setEmployee(current);
        const details = await api.get(`/employees/code/${encodeURIComponent(current.employeeCode || current.id)}`);
        detailData = details.data || current;
        setEmployee(detailData);
      }

      try {
        const photoUrlPath = isSelfMode
          ? `/me/photo`
          : `/employees/code/${encodeURIComponent(detailData.employeeCode || detailData.id)}/photo`;
        const photoResponse = await api.get(photoUrlPath, { responseType: "blob" });
        if (photoResponse.data && photoResponse.data.size > 0) {
          setPhotoUrl(URL.createObjectURL(photoResponse.data));
        } else {
          setPhotoUrl(DEFAULT_AVATAR);
        }
      } catch {
        setPhotoUrl(DEFAULT_AVATAR);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load employee profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee();
  }, [id]);

  useEffect(() => () => {
    if (photoUrl && photoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoUrl);
    }
  }, [photoUrl]);

  const summary = useMemo(() => {
    if (!employee) return [];
    return [
      { icon: "badge", label: "Employee code", value: employee.employeeCode || employee.id },
      { icon: "corporate_fare", label: "Department", value: employee.department },
      { icon: "workspace_premium", label: "Designation", value: employee.designation },
      { icon: "calendar_month", label: "Joined on", value: formatDate(employee.joiningDate) },
    ];
  }, [employee]);

  const handlePhotoClick = () => {
    inputRef.current?.click();
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Only JPG, PNG, or WEBP images are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const formDataObj = new FormData();
      formDataObj.append("photo", file);

      const uploadPath = isSelfMode
        ? `/me/photo`
        : `/employees/code/${encodeURIComponent(employee?.employeeCode || employee?.id)}/photo`;

      await api.post(uploadPath, formDataObj, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadEmployee();
      alert("Employee photo uploaded successfully.");
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to upload photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // --- Edit profile (self mode only) ---
  const startEditing = () => {
    setFormData({
      contact: employee?.contact || "",
      address: employee?.address || "",
      bankName: employee?.bankName || "",
      accountNumber: employee?.accountNumber || "",
      ifscCode: employee?.ifscCode || "",
    });
    setEditError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError("");
  };

  const handleFormChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProfile = async () => {
    setEditError("");

    // Basic client-side checks matching backend rules
    if (formData.contact && !/^[6-9][0-9]{9}$/.test(formData.contact)) {
      setEditError("Mobile number must be a valid 10-digit Indian mobile number.");
      return;
    }
    if (formData.accountNumber && !/^[0-9]{9,18}$/.test(formData.accountNumber)) {
      setEditError("Account number must be 9-18 digits.");
      return;
    }
    if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      setEditError("Enter a valid IFSC code (e.g. HDFC0001234).");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/me/profile`, formData);
      await loadEmployee();
      setIsEditing(false);
    } catch (err) {
      setEditError(err?.response?.data?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="employees-page"><div className="dashboard-card profile-state-card"><span className="material-symbols-outlined profile-state-icon">progress_activity</span><p>Loading employee profile…</p></div></div>;
  }

  if (error || !employee) {
    return <div className="employees-page"><div className="dashboard-card profile-state-card"><span className="material-symbols-outlined profile-state-icon">person_off</span><h2>Employee profile unavailable</h2><p>{error || "Employee not found."}</p><button type="button" className="btn btn-secondary" onClick={() => navigate("/employees")}><span className="material-symbols-outlined">arrow_back</span>Back to Employees</button></div></div>;
  }

  const displayName = toDisplayName(employee);
  const status = employee.status || (employee.active === false ? "Inactive" : "Active");
  const isActive = String(status).toLowerCase() === "active";

  const personalDetails = [
    { icon: "person", label: "Full name", value: displayName },
    { icon: "person", label: "First name", value: displayValue(employee.firstName) },
    { icon: "person", label: "Last name", value: displayValue(employee.lastName) },
    { icon: "cake", label: "Date of birth", value: formatDate(employee.dateOfBirth) },
    { icon: "wc", label: "Gender", value: displayValue(employee.gender) },
    { icon: "call", label: "Mobile number", value: displayValue(employee.contact) },
    { icon: "mail", label: "Email address", value: displayValue(employee.email) },
    { icon: "location_on", label: "Address", value: displayValue(employee.address), wide: true },
  ];

  const employmentDetails = [
    { icon: "business", label: "Assigned Firm", value: employee.firmCode ? `${employee.firmCode}${employee.firmName ? ` · ${employee.firmName}` : ""}` : employee.firmId ? "Firm details unavailable" : "Not assigned" },
    { icon: "badge", label: "Employee code", value: displayValue(employee.employeeCode || employee.id) },
    { icon: "corporate_fare", label: "Department", value: displayValue(employee.department) },
    { icon: "workspace_premium", label: "Designation", value: displayValue(employee.designation) },
    { icon: "work", label: "Employment type", value: displayValue(employee.employmentType) },
    { icon: "event_available", label: "Joining date", value: formatDate(employee.joiningDate) },
    { icon: "verified", label: "Employment status", value: status, status: true },
  ];

  const salaryDetails = [
    { icon: "schedule", label: "Wage type", value: displayValue(employee.wageType) },
    {
      icon: "currency_rupee",
      label: employee.wageType === "Daily" ? "Daily wage" : "Monthly salary",
      value: formatCurrency(employee.monthlySalary),
    },
    { icon: "payments", label: "Payment mode", value: displayValue(employee.paymentMode) },
    { icon: "access_time", label: "Standard shift length", value: employee.shiftLength ? `${employee.shiftLength} hours` : "Not provided" },
    { icon: "more_time", label: "OT starts after", value: employee.otStartsAfter ? `${employee.otStartsAfter} hours worked` : "Not provided" },
    { icon: "price_check", label: "OT rate per hour", value: formatCurrency(employee.otRate) },
  ];

  const bankDetails = [
    { icon: "account_balance", label: "Bank name", value: displayValue(employee.bankName) },
    { icon: "credit_card", label: "Account number", value: displayValue(employee.accountNumber) },
    { icon: "tag", label: "IFSC code", value: displayValue(employee.ifscCode) },
  ];

  const complianceDetails = [
    { icon: "account_balance_wallet", label: "PF account number", value: displayValue(employee.pfAccountNumber) },
    { icon: "health_and_safety", label: "ESI account number", value: displayValue(employee.esiAccountNumber) },
    { icon: "fingerprint", label: "Aadhaar number", value: displayValue(employee.aadharNumber) },
    { icon: "id_card", label: "PAN number", value: displayValue(employee.panNumber) },
    { icon: "description", label: "Aadhaar document", value: employee.hasAadharDocument ? "Document on file" : "Not uploaded" },
    { icon: "description", label: "PAN document", value: employee.hasPanDocument ? "Document on file" : "Not uploaded" },
    { icon: "account_balance_wallet", label: "Statutory schemes", value: displayValue(employee.statutorySchemes), wide: true },
  ];

  const renderDetails = (details) => details.map((item) => (
    <div key={item.label} className={`profile-detail-item${item.wide ? " profile-detail-item-wide" : ""}`}>
      <span className="material-symbols-outlined profile-detail-icon" aria-hidden="true">{item.icon}</span>
      <div>
        <span className="profile-detail-label">{item.label}</span>
        {item.status ? (
          <span className={`profile-status-badge ${isActive ? "is-active" : "is-inactive"}`}>
            <span aria-hidden="true" />{item.value}
          </span>
        ) : (
          <strong>{item.value}</strong>
        )}
      </div>
    </div>
  ));

  return (
    <div className="employees-page employee-profile-page">
      <div className="page-header">
        <div>
          <h1>{isSelfMode ? "My Profile" : "Employee Profile"}</h1>
          <p>{isSelfMode ? "View and manage your personal information." : "View personal and employment information."}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isSelfMode && !isEditing && (
            <button type="button" className="btn btn-primary" onClick={startEditing}>
              <span className="material-symbols-outlined">edit</span>Edit Profile
            </button>
          )}
          {!isSelfMode && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/employees")}>
              <span className="material-symbols-outlined">arrow_back</span>Back
            </button>
          )}
        </div>
      </div>

      {isSelfMode && isEditing && (
        <section className="dashboard-card profile-details-card" aria-labelledby="edit-profile-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
            <div><h3 id="edit-profile-heading">Edit contact &amp; bank details</h3><p>Other fields can only be changed by HR/Admin.</p></div>
          </div>

          {editError && (
            <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{editError}</p>
          )}

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <span className="profile-detail-label">Mobile number</span>
              <input
                type="text"
                value={formData.contact}
                onChange={handleFormChange("contact")}
                placeholder="10-digit mobile number"
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </div>
            <div className="profile-detail-item profile-detail-item-wide">
              <span className="profile-detail-label">Address</span>
              <input
                type="text"
                value={formData.address}
                onChange={handleFormChange("address")}
                placeholder="Your current address"
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Bank name</span>
              <input
                type="text"
                value={formData.bankName}
                onChange={handleFormChange("bankName")}
                placeholder="Bank name"
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Account number</span>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={handleFormChange("accountNumber")}
                placeholder="Bank account number"
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">IFSC code</span>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={handleFormChange("ifscCode")}
                placeholder="e.g. HDFC0001234"
                style={{ width: "100%", padding: "8px", marginTop: "4px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={cancelEditing} disabled={saving}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="dashboard-card employee-profile-hero" aria-labelledby="employee-name">
        <div className="profile-identity">
          <div className="profile-photo-wrapper">
            <img src={photoUrl || DEFAULT_AVATAR} alt={`${displayName}'s profile`} className="profile-photo-large" onError={() => setPhotoUrl(DEFAULT_AVATAR)} style={{ cursor: photoUrl !== DEFAULT_AVATAR ? "zoom-in" : "default" }} onClick={() => photoUrl !== DEFAULT_AVATAR && setViewingPhoto(true)} />
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handlePhotoUpload} />
            <button type="button" className="profile-photo-button" onClick={handlePhotoClick} disabled={uploading} aria-label={photoUrl !== DEFAULT_AVATAR ? "Change profile photo" : "Upload profile photo"}>
              <span className="material-symbols-outlined" aria-hidden="true">{uploading ? "progress_activity" : "photo_camera"}</span>
            </button>
          </div>

          <div className="profile-name-block">
            <div className="profile-name-row">
              <h2 id="employee-name">{displayName}</h2>
              <span className={`profile-status-badge ${isActive ? "is-active" : "is-inactive"}`}>
                <span aria-hidden="true" />{status}
              </span>
            </div>
            <p>{displayValue(employee.designation)} · {displayValue(employee.department)}</p>
            <button type="button" className="profile-upload-link" onClick={handlePhotoClick} disabled={uploading}>
              {uploading ? "Uploading photo…" : photoUrl !== DEFAULT_AVATAR ? "Change photo" : "Upload photo"}
            </button>
          </div>
        </div>

        <div className="profile-summary-grid">
          {summary.map((item) => (
            <div key={item.label} className="profile-summary-item">
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <div>
                <span>{item.label}</span>
                <strong>{displayValue(item.value)}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="profile-content-grid">
        <section className="dashboard-card profile-details-card" aria-labelledby="personal-details-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">person</span>
            <div><h3 id="personal-details-heading">Personal details</h3><p>Contact and basic information</p></div>
          </div>
          <div className="profile-details-grid">{renderDetails(personalDetails)}</div>
        </section>

        <section className="dashboard-card profile-details-card" aria-labelledby="employment-details-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">business_center</span>
            <div><h3 id="employment-details-heading">Employment details</h3><p>Role and work information</p></div>
          </div>
          <div className="profile-details-grid">{renderDetails(employmentDetails)}</div>
        </section>

        <section className="dashboard-card profile-details-card" aria-labelledby="salary-details-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">payments</span>
            <div><h3 id="salary-details-heading">Salary and work schedule</h3><p>Pay structure, shift, and overtime information</p></div>
          </div>
          <div className="profile-details-grid">{renderDetails(salaryDetails)}</div>
        </section>

        <section className="dashboard-card profile-details-card" aria-labelledby="bank-details-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
            <div><h3 id="bank-details-heading">Bank details</h3><p>Account used for salary payments</p></div>
          </div>
          <div className="profile-details-grid">{renderDetails(bankDetails)}</div>
        </section>

        <section className="dashboard-card profile-details-card profile-compliance-card" aria-labelledby="compliance-details-heading">
          <div className="profile-card-heading">
            <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
            <div><h3 id="compliance-details-heading">KYC and statutory details</h3><p>Identity documents and applicable schemes</p></div>
          </div>
          <div className="profile-details-grid">{renderDetails(complianceDetails)}</div>
        </section>

        {viewingPhoto && (
  <PhotoViewerModal photoUrl={photoUrl} altText={`${displayName}'s profile`} onClose={() => setViewingPhoto(false)} />
)}
      </div>
    </div>
  );
};

export default EmployeeProfile;
