import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getEmployeeFirm,
  getEmployeeUser,
  localDate,
} from "../utils/employeePortal";
import useLeaveRequests from "../hooks/useLeaveRequests";
import api from "../api/axios";
import PhotoViewerModal from "../components/PhotoViewerModal";
import "../styles/employee-portal.css";

const Icon = ({ children }) => (
  <span className="material-symbols-outlined" aria-hidden="true">
    {children}
  </span>
);

const links = [
  {
    to: "/employee/attendance",
    icon: "calendar_month",
    title: "My Attendance",
    text: "See the days you worked",
  },
  {
    to: "/employee/leaves",
    icon: "event_available",
    title: "Apply for Leave",
    text: "Choose your leave dates",
  },
  {
    to: "/employee/profile",
    icon: "person",
    title: "My Profile",
    text: "See your details and firm",
  },
];

function Heading({ title, text, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>

      <div className="page-header-actions">{children}</div>
    </div>
  );
}

function Card({ title, children, action }) {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <h2>{title}</h2>
        {action}
      </div>

      <div className="ep-card-body">{children}</div>
    </section>
  );
}

function Empty({ icon = "inbox", title, text }) {
  return (
    <div className="ep-empty">
      <Icon>{icon}</Icon>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}

function Stats({ items }) {
  return (
    <div className="stats-grid">
      {items.map(([title, value, icon, note]) => (
        <div className="stat-card" key={title}>
          <div className="stat-card-top">
            <div className="stat-icon">
              <Icon>{icon}</Icon>
            </div>

            <span className="ep-muted">{note}</span>
          </div>

          <div className="stat-content">
            <h2>{value}</h2>
            <p>{title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------
// Attendance helpers
// ---------------------------------------------------------

function formatTime(value) {
  if (!value) return "—";

  const [h, m] = value.split(":");
  const hour = parseInt(h, 10);

  if (Number.isNaN(hour)) return "—";

  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${m} ${ampm}`;
}

function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);

  if (
    [ih, im, oh, om].some(
      (value) => Number.isNaN(value)
    )
  ) {
    return 0;
  }

  let minutes = oh * 60 + om - (ih * 60 + im);

  if (minutes < 0) {
    minutes += 24 * 60;
  }

  return minutes / 60;
}

function statusLabel(status) {
  const map = {
    PRESENT: "Present",
    LATE: "Late",
    COMPLETED: "Present",
    PENDING: "Checked in",
    MISSING_CHECKOUT: "Missing Checkout",
    ABSENT: "Absent",
    PAID_LEAVE: "Paid Leave",
    WEEKLY_OFF: "Weekly Off",
    HOLIDAY: "Holiday",
  };

  return map[status] || status || "—";
}

async function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error("Location is not supported on this device.")
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () =>
        reject(
          new Error(
            "Please allow location access to check in/out."
          )
        ),
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  });
}

// =========================================================
// Employee Dashboard
// =========================================================

export function EmployeeDashboard() {
  const { user } = useAuth();

  const employee = getEmployeeUser(user);
  const firm = getEmployeeFirm(user);

  const {
    records: leaveRequests,
    loading: leaveLoading,
    error: leaveError,
  } = useLeaveRequests({
    mine: true,
    enabled: !!employee,
  });

  const leaveCount = (status) =>
    !employee || leaveLoading || leaveError
      ? "—"
      : leaveRequests.filter(
          (request) => request.status === status
        ).length;

  const [today, setToday] = useState(null);
  const [loadingToday, setLoadingToday] = useState(!!employee);
  const [punchError, setPunchError] = useState("");
  const [punching, setPunching] = useState(false);

  const [monthStats, setMonthStats] = useState({
    daysPresent: "—",
    hoursWorked: "—",
  });

  const loadToday = useCallback(async () => {
    if (!employee) return;

    try {
      setLoadingToday(true);

      const res = await api.get("/me/attendance/today");

      setToday(res.data || null);
    } catch (err) {
      console.error("Unable to load today's attendance:", err);
      setToday(null);
    } finally {
      setLoadingToday(false);
    }
  }, [employee]);

  const loadMonthStats = useCallback(async () => {
    if (!employee) return;

    try {
      const month = localDate().slice(0, 7);

      const res = await api.get("/me/attendance", {
        params: { month },
      });

      const records = res.data || [];

      const daysPresent = records.filter((r) =>
        ["PRESENT", "LATE", "COMPLETED"].includes(
          r.status
        )
      ).length;

      const hoursWorked = records.reduce(
        (sum, r) =>
          sum +
          hoursBetween(
            r.checkInTime,
            r.checkOutTime
          ),
        0
      );

      setMonthStats({
        daysPresent,
        hoursWorked: hoursWorked.toFixed(1),
      });
    } catch (err) {
      console.error(
        "Unable to load attendance statistics:",
        err
      );

      setMonthStats({
        daysPresent: "—",
        hoursWorked: "—",
      });
    }
  }, [employee]);

  useEffect(() => {
    loadToday();
    loadMonthStats();
  }, [loadToday, loadMonthStats]);

  // -------------------------------------------------------
  // Employee Check In
  // -------------------------------------------------------

  const handleCheckIn = async () => {
    setPunchError("");

    try {
      setPunching(true);

      const { latitude, longitude } =
        await getBrowserLocation();

      await api.post("/me/attendance/checkin", {
        latitude,
        longitude,
      });

      await loadToday();
      await loadMonthStats();
    } catch (err) {
      console.error("Employee check-in error:", err);

      setPunchError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to check in."
      );
    } finally {
      setPunching(false);
    }
  };

  // -------------------------------------------------------
  // Employee Check Out
  // -------------------------------------------------------

  const handleCheckOut = async () => {
    setPunchError("");

    try {
      setPunching(true);

      const { latitude, longitude } =
        await getBrowserLocation();

      await api.post("/me/attendance/checkout", {
        latitude,
        longitude,
      });

      await loadToday();
      await loadMonthStats();
    } catch (err) {
      console.error("Employee checkout error:", err);

      setPunchError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to check out."
      );
    } finally {
      setPunching(false);
    }
  };

  // -------------------------------------------------------
  // Button states
  // -------------------------------------------------------

  const isMissingCheckout =
    today?.status === "MISSING_CHECKOUT";

  const canCheckIn =
    !today &&
    !punching &&
    !loadingToday;

  const canCheckOut =
    today &&
    today.checkInTime &&
    !today.checkOutTime &&
    !isMissingCheckout &&
    !punching &&
    !loadingToday;

  const totalHoursToday = today
    ? hoursBetween(
        today.checkInTime,
        today.checkOutTime
      ).toFixed(1)
    : null;

  return (
    <div className="dashboard-page employee-portal">
      <Heading
        title="Dashboard"
        text="Your attendance, leave, and details."
      >
        <Link
          className="primary-button"
          to="/employee/leaves"
        >
          <Icon>add</Icon>
          Apply for Leave
        </Link>
      </Heading>

      <section className="ep-welcome">
        <div>
          <span className="ep-eyebrow">
            EMPLOYEE PORTAL
          </span>

          <h2>
            {employee?.fullName
              ? `Welcome, ${employee.fullName}`
              : "Welcome"}
          </h2>

          <p>
            {firm
              ? `Your firm: ${firm.code}${
                  firm.name ? ` · ${firm.name}` : ""
                }`
              : "Your assigned firm will appear here."}
          </p>
        </div>

        <div className="ep-welcome-icon">
          <Icon>badge</Icon>
        </div>
      </section>

      <Stats
        items={[
          [
            "Days Present",
            monthStats.daysPresent,
            "check_circle",
            "This month",
          ],
          [
            "Hours Worked",
            monthStats.hoursWorked,
            "schedule",
            "This month",
          ],
          [
            "Approved Leave",
            leaveCount("Approved"),
            "event_available",
            "Requests",
          ],
          [
            "Pending Leave",
            leaveCount("Pending"),
            "pending_actions",
            "Awaiting review",
          ],
        ]}
      />

      <div className="ep-columns">
        <Card
          title="Today's Attendance"
          action={
            <span className="ep-badge">
              {today
                ? statusLabel(today.status)
                : "Not checked in"}
            </span>
          }
        >
          <div className="ep-time-grid">
            <div>
              <Icon>login</Icon>
              <span>Check In</span>
              <strong>
                {formatTime(today?.checkInTime)}
              </strong>
            </div>

            <div>
              <Icon>logout</Icon>
              <span>Check Out</span>
              <strong>
                {formatTime(today?.checkOutTime)}
              </strong>
            </div>

            <div>
              <Icon>schedule</Icon>
              <span>Total Hours</span>
              <strong>
                {totalHoursToday ?? "—"}
              </strong>
            </div>
          </div>

          {punchError && (
            <p
              className="ep-note"
              style={{ color: "#b91c1c" }}
            >
              {punchError}
            </p>
          )}

          {isMissingCheckout && (
            <div
              className="ep-note"
              style={{
                color: "#b45309",
                marginBottom: "12px",
              }}
            >
              <strong>Missing checkout:</strong>{" "}
              Your shift ended without a checkout.
              Please contact your supervisor to
              enter the correct checkout time.
            </div>
          )}

          <div className="ep-checkin-actions">
            <button
              className="primary-button"
              onClick={handleCheckIn}
              disabled={!canCheckIn}
            >
              <Icon>login</Icon>
              {punching
                ? "Working…"
                : "Check In"}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleCheckOut}
              disabled={!canCheckOut}
            >
              <Icon>logout</Icon>
              {punching
                ? "Working…"
                : "Check Out"}
            </button>
          </div>

          <p
            className="ep-note"
            id="attendance-help"
          >
            Check-in and employee checkout require
            location access and must be within range
            of your office.
          </p>

          <Link
            className="ep-text-link"
            to="/employee/attendance"
          >
            View My Attendance{" "}
            <Icon>arrow_forward</Icon>
          </Link>
        </Card>

        <Card title="Quick Links">
          <div className="ep-quick-links">
            {links.map((item) => (
              <Link
                to={item.to}
                key={item.to}
              >
                <div className="ep-link-icon">
                  <Icon>{item.icon}</Icon>
                </div>

                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>

                <Icon>chevron_right</Icon>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="My Leave"
        action={
          <Link
            className="ep-text-link"
            to="/employee/leaves"
          >
            View My Leave{" "}
            <Icon>arrow_forward</Icon>
          </Link>
        }
      >
        {leaveLoading ? (
          <Empty
            icon="event_available"
            title="Loading leave requests…"
          />
        ) : leaveError ? (
          <Empty
            icon="error"
            title="Could not load leave requests"
            text={leaveError}
          />
        ) : leaveRequests.length ? (
          <div className="ep-draft-summary">
            <Icon>event_available</Icon>

            <div>
              <strong>
                {leaveRequests.length} submitted
                requests
              </strong>

              <p>
                {leaveCount("Pending")} pending ·{" "}
                {leaveCount("Approved")} approved.
                Open My Leave to see decisions.
              </p>
            </div>
          </div>
        ) : (
          <Empty
            icon="event_available"
            title="No leave requests"
            text="Need a day off? Select Apply for Leave."
          />
        )}
      </Card>
    </div>
  );
}

// =========================================================
// My Attendance
// =========================================================

export function MyAttendance() {
  const { user } = useAuth();

  const isEmployee =
    getEmployeeUser(user) != null;

  const [month, setMonth] = useState(() =>
    localDate().slice(0, 7)
  );

  const [status, setStatus] =
    useState("All days");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] =
    useState(isEmployee);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    if (!isEmployee) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.get(
        "/me/attendance",
        {
          params: { month },
        }
      );

      setRecords(res.data || []);
    } catch (err) {
      console.error(
        "Unable to load employee attendance:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load your attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [isEmployee, month]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = records.filter((r) => {
    if (status === "All days") {
      return true;
    }

    if (status === "Present") {
      return (
        r.status === "PRESENT" ||
        r.status === "COMPLETED"
      );
    }

    if (status === "Absent") {
      return r.status === "ABSENT";
    }

    if (status === "Late") {
      return r.status === "LATE";
    }

    if (status === "Paid leave") {
      return r.status === "PAID_LEAVE";
    }

    if (status === "Weekly off") {
      return r.status === "WEEKLY_OFF";
    }

    if (status === "Holiday") {
      return r.status === "HOLIDAY";
    }

    if (status === "Missing checkout") {
      return r.status === "MISSING_CHECKOUT";
    }

    return true;
  });

  const daysPresent = records.filter((r) =>
    ["PRESENT", "LATE", "COMPLETED"].includes(
      r.status
    )
  ).length;

  const daysAbsent = records.filter(
    (r) => r.status === "ABSENT"
  ).length;

  const onLeave = records.filter(
    (r) => r.status === "PAID_LEAVE"
  ).length;

  const hoursWorked = records
    .reduce(
      (sum, r) =>
        sum +
        hoursBetween(
          r.checkInTime,
          r.checkOutTime
        ),
      0
    )
    .toFixed(1);

  return (
    <div className="dashboard-page employee-portal">
      <Heading
        title="My Attendance"
        text="See your work days and attendance times."
      />

      <Stats
        items={[
          [
            "Days Present",
            isEmployee ? daysPresent : "—",
            "check_circle",
            "Selected month",
          ],
          [
            "Days Absent",
            isEmployee ? daysAbsent : "—",
            "cancel",
            "Selected month",
          ],
          [
            "On Leave",
            isEmployee ? onLeave : "—",
            "event_busy",
            "Selected month",
          ],
          [
            "Hours Worked",
            isEmployee ? hoursWorked : "—",
            "schedule",
            "Selected month",
          ],
        ]}
      />

      <Card title="Attendance History">
        <div className="ep-toolbar">
          <label>
            Month
            <input
              type="month"
              value={month}
              onChange={(e) =>
                setMonth(e.target.value)
              }
            />
          </label>

          <label>
            Show
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              {[
                "All days",
                "Present",
                "Absent",
                "Late",
                "Paid leave",
                "Weekly off",
                "Holiday",
                "Missing checkout",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="ep-table-scroll">
          <table className="ep-table">
            <thead>
              <tr>
                {[
                  "Date",
                  "Check In",
                  "Check Out",
                  "Work Hours",
                  "Status",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!isEmployee && (
                <tr>
                  <td colSpan="5">
                    <Empty
                      icon="calendar_month"
                      title="Attendance is not available"
                      text="Sign in as an employee to see records."
                    />
                  </td>
                </tr>
              )}

              {isEmployee && loading && (
                <tr>
                  <td colSpan="5">
                    <Empty
                      icon="progress_activity"
                      title="Loading…"
                      text="Fetching your attendance."
                    />
                  </td>
                </tr>
              )}

              {isEmployee &&
                !loading &&
                error && (
                  <tr>
                    <td colSpan="5">
                      <Empty
                        icon="error"
                        title="Couldn't load attendance"
                        text={error}
                      />
                    </td>
                  </tr>
                )}

              {isEmployee &&
                !loading &&
                !error &&
                filtered.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <Empty
                        icon="calendar_month"
                        title="No records for this month"
                        text="Your attendance records will appear here."
                      />
                    </td>
                  </tr>
                )}

              {isEmployee &&
                !loading &&
                !error &&
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.attendanceDate}</td>

                    <td>
                      {formatTime(r.checkInTime)}
                    </td>

                    <td>
                      {formatTime(r.checkOutTime)}
                    </td>

                    <td>
                      {hoursBetween(
                        r.checkInTime,
                        r.checkOutTime
                      ).toFixed(1)}
                    </td>

                    <td>
                      {statusLabel(r.status)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="ep-note">
          If your attendance is wrong, please contact
          your supervisor.
        </p>
      </Card>
    </div>
  );
}

// =========================================================
// My Profile
// =========================================================

export function MyProfile() {
  const { user } = useAuth();

  const isEmployee =
    getEmployeeUser(user) != null;

  const inputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] =
    useState(isEmployee);

  const [loadError, setLoadError] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [viewingPhoto, setViewingPhoto] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [formData, setFormData] = useState({
    contact: "",
    address: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  const loadProfile = async () => {
    if (!isEmployee) return;

    try {
      setLoading(true);
      setLoadError("");

      const res =
        await api.get("/me/profile");

      setProfile(res.data);
    } catch (err) {
      setLoadError(
        err?.response?.data?.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPhoto = async () => {
    if (!isEmployee) return;

    try {
      const res = await api.get(
        "/me/photo",
        {
          responseType: "blob",
        }
      );

      if (
        res.data &&
        res.data.size > 0
      ) {
        setPhotoUrl(
          URL.createObjectURL(res.data)
        );
      } else {
        setPhotoUrl(null);
      }
    } catch {
      setPhotoUrl(null);
    }
  };

  useEffect(() => {
    loadProfile();
    loadPhoto();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (
        photoUrl &&
        photoUrl.startsWith("blob:")
      ) {
        URL.revokeObjectURL(photoUrl);
      }
    },
    [photoUrl]
  );

  const name =
    profile?.name ||
    user?.fullName ||
    user?.username;

  const handlePhotoClick = () => {
    inputRef.current?.click();
  };

  const handlePhotoUpload = async (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      alert(
        "Only JPG, PNG, or WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      alert(
        "Photo must be 2 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formDataObj =
        new FormData();

      formDataObj.append(
        "photo",
        file
      );

      await api.post(
        "/me/photo",
        formDataObj,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      await loadPhoto();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Unable to upload photo."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const startEditing = () => {
    setFormData({
      contact:
        profile?.contact || "",
      address:
        profile?.address || "",
      bankName:
        profile?.bankName || "",
      accountNumber:
        profile?.accountNumber || "",
      ifscCode:
        profile?.ifscCode || "",
    });

    setEditError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError("");
  };

  const handleFormChange =
    (field) => (e) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSaveProfile =
    async () => {
      setEditError("");

      if (
        formData.contact &&
        !/^[6-9][0-9]{9}$/.test(
          formData.contact
        )
      ) {
        setEditError(
          "Mobile number must be a valid 10-digit Indian mobile number."
        );
        return;
      }

      if (
        formData.accountNumber &&
        !/^[0-9]{9,18}$/.test(
          formData.accountNumber
        )
      ) {
        setEditError(
          "Account number must be 9-18 digits."
        );
        return;
      }

      if (
        formData.ifscCode &&
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          formData.ifscCode
        )
      ) {
        setEditError(
          "Enter a valid IFSC code (e.g. HDFC0001234)."
        );
        return;
      }

      try {
        setSaving(true);

        await api.put(
          "/me/profile",
          formData
        );

        await loadProfile();

        setIsEditing(false);
      } catch (err) {
        setEditError(
          err?.response?.data?.message ||
            "Unable to update profile."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="dashboard-page employee-portal">
      <Heading
        title="My Profile"
        text="Your details and assigned firm."
      >
        {isEmployee &&
          !isEditing &&
          !loading &&
          !loadError && (
            <button
              type="button"
              className="primary-button"
              onClick={startEditing}
            >
              <Icon>edit</Icon>
              Edit Profile
            </button>
          )}
      </Heading>

      {!isEmployee && (
        <p className="ep-note">
          Employee preview. Personal details appear
          when an employee signs in.
        </p>
      )}

      {isEmployee && loading && (
        <p className="ep-note">
          Loading your profile…
        </p>
      )}

      {isEmployee && loadError && (
        <p className="ep-note">
          {loadError}
        </p>
      )}

      {isEmployee && isEditing && (
        <Card title="Edit contact & bank details">
          {editError && (
            <p
              className="ep-note"
              style={{
                color: "#b91c1c",
              }}
            >
              {editError}
            </p>
          )}

          <div className="ep-profile-grid">
            <label>
              Mobile number
              <input
                type="text"
                value={formData.contact}
                onChange={handleFormChange(
                  "contact"
                )}
                placeholder="10-digit mobile number"
              />
            </label>

            <label>
              Address
              <input
                type="text"
                value={formData.address}
                onChange={handleFormChange(
                  "address"
                )}
                placeholder="Your current address"
              />
            </label>

            <label>
              Bank name
              <input
                type="text"
                value={formData.bankName}
                onChange={handleFormChange(
                  "bankName"
                )}
                placeholder="Bank name"
              />
            </label>

            <label>
              Account number
              <input
                type="text"
                value={
                  formData.accountNumber
                }
                onChange={handleFormChange(
                  "accountNumber"
                )}
                placeholder="Bank account number"
              />
            </label>

            <label>
              IFSC code
              <input
                type="text"
                value={formData.ifscCode}
                onChange={handleFormChange(
                  "ifscCode"
                )}
                placeholder="e.g. HDFC0001234"
              />
            </label>
          </div>

          <div className="ep-checkin-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : "Save changes"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {isEmployee &&
        !loading &&
        !loadError && (
          <div className="ep-profile-grid">
            <section className="dashboard-card ep-identity">
              <div
                className="ep-avatar-wrapper"
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={`${name || "Employee"}'s profile`}
                    className="ep-avatar"
                    style={{
                      objectFit: "cover",
                      cursor: "zoom-in",
                    }}
                    onClick={() =>
                      setViewingPhoto(true)
                    }
                    onError={() =>
                      setPhotoUrl(null)
                    }
                  />
                ) : (
                  <div className="ep-avatar">
                    {name
                      ? name
                          .split(/\s+/)
                          .map(
                            (n) => n[0]
                          )
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : (
                        <Icon>person</Icon>
                      )}
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={
                    handlePhotoUpload
                  }
                />

                <button
                  type="button"
                  onClick={
                    handlePhotoClick
                  }
                  disabled={uploading}
                  aria-label={
                    photoUrl
                      ? "Change profile photo"
                      : "Upload profile photo"
                  }
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    background: "#dc2626",
                    color: "#fff",
                    border: "2px solid #fff",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    cursor: "pointer",
                  }}
                >
                  <Icon>
                    {uploading
                      ? "progress_activity"
                      : "photo_camera"}
                  </Icon>
                </button>
              </div>

              <h2>
                {name || "Employee"}
              </h2>

              <p>
                {profile?.email ||
                  "Email not available"}
              </p>

              <span className="ep-badge">
                {profile?.status ||
                  "Employee"}
              </span>

              <button
                type="button"
                className="ep-text-link"
                onClick={
                  handlePhotoClick
                }
                disabled={uploading}
                style={{
                  marginTop: "8px",
                }}
              >
                {uploading
                  ? "Uploading…"
                  : photoUrl
                  ? "Change photo"
                  : "Upload photo"}
              </button>

              <div className="ep-identity-code">
                <span>
                  Employee Code
                </span>

                <strong>
                  {profile?.employeeCode ||
                    "Not available"}
                </strong>
              </div>
            </section>

            <div className="ep-stack">
              <Card title="My Details">
                <dl className="ep-details">
                  {[
                    ["Full Name", name],
                    [
                      "First Name",
                      profile?.firstName,
                    ],
                    [
                      "Last Name",
                      profile?.lastName,
                    ],
                    [
                      "Gender",
                      profile?.gender,
                    ],
                    [
                      "Date of Birth",
                      profile?.dateOfBirth
                        ? new Date(
                            `${profile.dateOfBirth}T00:00:00`
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : null,
                    ],
                    [
                      "Email",
                      profile?.email,
                    ],
                    [
                      "Phone Number",
                      profile?.contact,
                    ],
                    [
                      "Employee Code",
                      profile?.employeeCode,
                    ],
                    [
                      "Department",
                      profile?.department,
                    ],
                    [
                      "Designation",
                      profile?.designation,
                    ],
                    [
                      "Employment Type",
                      profile?.employmentType,
                    ],
                    [
                      "Address",
                      profile?.address,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          {value ||
                            "Not available"}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </Card>

              <Card title="Bank Details">
                <dl className="ep-details">
                  {[
                    [
                      "Bank Name",
                      profile?.bankName,
                    ],
                    [
                      "Account Number",
                      profile?.accountNumber,
                    ],
                    [
                      "IFSC Code",
                      profile?.ifscCode,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          {value ||
                            "Not available"}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </Card>

              <Card title="Statutory Details">
                <dl className="ep-details">
                  {[
                    [
                      "PF Account Number",
                      profile?.pfAccountNumber,
                    ],
                    [
                      "ESI Account Number",
                      profile?.esiAccountNumber,
                    ],
                    [
                      "Statutory Schemes",
                      profile?.statutorySchemes,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          {value ||
                            "Not available"}
                        </dd>
                      </div>
                    )
                  )}
                </dl>
              </Card>

              <Card title="My Firm">
                <dl className="ep-details">
                  <div>
                    <dt>
                      Assigned Firm
                    </dt>
                    <dd>
                      Not assigned
                    </dd>
                  </div>

                  <div>
                    <dt>Role</dt>
                    <dd>Employee</dd>
                  </div>
                </dl>

                <p className="ep-note">
                  <Icon>info</Icon>
                  Need to change your details?
                  Please contact HR.
                </p>
              </Card>
            </div>
          </div>
        )}

      {viewingPhoto && (
        <PhotoViewerModal
          photoUrl={photoUrl}
          altText={`${name || "Employee"}'s profile`}
          onClose={() =>
            setViewingPhoto(false)
          }
        />
      )}
    </div>
  );
}