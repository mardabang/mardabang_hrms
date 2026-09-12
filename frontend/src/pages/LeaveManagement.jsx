import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import useLeaveRequests, { leaveError } from "../hooks/useLeaveRequests";
import api from "../api/axios";
import "../styles/leave-management.css";

const TYPES = ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"];
const STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"];
const emptyForm = () => ({ type: TYPES[0], from: "", to: "", reason: "" });
const Icon = ({ children }) => <span className="material-symbols-outlined" aria-hidden="true">{children}</span>;
const dateLabel = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function LeaveManagement({ portal = "employee" }) {
  const { user } = useAuth();
  const { selectedFirm } = useFirm();
  const employeeView = portal === "employee";
  const preview = employeeView && user?.role !== "EMPLOYEE";
  const [tab, setTab] = useState(employeeView ? "mine" : "requests");
  const ownView = employeeView || tab === "mine";
  const firmCode = employeeView ? undefined : selectedFirm?.code;
  const enabled = !preview && (employeeView || !!firmCode);
  const [revision, setRevision] = useState(0);
  const { records, loading, error: loadError } = useLeaveRequests({ mine: ownView, firmCode, enabled, revision });
  const [policy, setPolicy] = useState(null);
  const [policyError, setPolicyError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [dayResult, setDayResult] = useState(null);
  const [dayError, setDayError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const submitting = useRef(false);
  const reviewRef = useRef(null);
  const visible = records.filter(item => (status === "All statuses" || item.status === status) &&
    `${item.employeeName || ""} ${item.employeeCode || ""} ${item.type || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const datesKey = `${form.from}:${form.to}`;
  const days = dayResult?.key === datesKey ? dayResult.days : null;

  useEffect(() => {
    const controller = new AbortController();
    setPolicyError("");
    api.get("/leaves/policy", { signal: controller.signal }).then(({ data }) => setPolicy(data))
      .catch(err => { if (!controller.signal.aborted) { setPolicy(null); setPolicyError(leaveError(err)); } });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    setDayError(""); setDayResult(null);
    if (!formOpen || !form.from || !form.to || form.to < form.from) return () => controller.abort();
    const timer = setTimeout(() => {
      api.get("/leaves/days", { params: { from: form.from, to: form.to }, signal: controller.signal })
        .then(({ data }) => setDayResult({ key: datesKey, days: data.days }))
        .catch(err => { if (!controller.signal.aborted) setDayError(leaveError(err)); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.from, form.to, formOpen, datesKey]);

  useEffect(() => {
    if (review) { reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); reviewRef.current?.querySelector("textarea")?.focus({ preventScroll: true }); }
  }, [review]);

  const act = async (operation, success) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await operation();
      setFormOpen(false); setReview(null); setMessage(success); setRevision(v => v + 1);
    } catch (err) { setError(leaveError(err)); }
    finally { submitting.current = false; setBusy(false); }
  };
  const submit = event => {
    event.preventDefault();
    if (!form.reason.trim()) { setError("Please enter a reason for your leave."); return; }
    if (days == null || days < 1) { setError("Choose dates with at least one working day."); return; }
    act(() => api.post("/leaves", { ...form, reason: form.reason.trim(), ...(firmCode ? { firmCode } : {}) }), "Your leave request has been submitted.");
  };
  const openForm = () => { setTab("mine"); setForm(emptyForm()); setFormOpen(true); setReview(null); setError(""); setMessage(""); };

  return <div className="dashboard-page leave-page">
    <div className="page-header">
      <div><h1>{employeeView ? "My Leave" : "Leave Management"}</h1><p>{employeeView ? "Apply for leave and track your requests." : "Review leave requests and see approval decisions."}</p></div>
      {(employeeView || portal === "supervisor") && <button className="primary-button" disabled={busy || !enabled} onClick={openForm}><Icon>add</Icon>Apply for Leave</button>}
    </div>
    {preview && <p className="leave-help">Sign in with an employee account to apply for leave.</p>}
    {!employeeView && <p className="leave-firm"><Icon>business</Icon>{selectedFirm ? `${selectedFirm.code} · ${selectedFirm.name || ""}` : "Select a firm to view leave requests."}</p>}
    {policy && <p className="leave-help">{employeeView ? `Leave up to ${policy.supervisorMaxDays} working days can be reviewed by your supervisor. Longer leave goes to admin.` : `Supervisors may decide assigned employees’ leave up to ${policy.supervisorMaxDays} working days. Longer requests and supervisors’ own leave go to admin. Admin can see every decision.`}</p>}
    {portal === "supervisor" && <div className="leave-tabs">{[["requests", "Employee Requests"], ["mine", "My Leave"]].map(([value, label]) => <button key={value} disabled={busy} aria-pressed={tab === value} className={tab === value ? "active" : ""} onClick={() => { setTab(value); setFormOpen(false); setReview(null); setSearch(""); setError(""); }}>{label}</button>)}</div>}
    {!ownView && <div className="stats-grid">{STATUSES.map(label => <div className="stat-card" key={label}><div className="stat-content"><h2>{loading || loadError || !enabled ? "—" : records.filter(r => r.status === label).length}</h2><p>{label} Requests</p></div></div>)}</div>}
    {(error || policyError) && <p className="leave-message leave-message-error" role="alert">{error || policyError}</p>}
    {message && <p className="leave-message" role="status">{message}</p>}
    {formOpen && <section className="dashboard-card leave-form-card">
      <div className="card-header"><h2>Apply for Leave</h2><button className="leave-text-button" disabled={busy} onClick={() => setFormOpen(false)}><Icon>close</Icon>Close</button></div>
      <form onSubmit={submit} className="leave-form">
        <label>Leave Type<select value={form.type} disabled={busy} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
        <label>From Date<input type="date" required min={policy?.today} value={form.from} disabled={busy} onChange={e => setForm({ ...form, from: e.target.value })} /></label>
        <label>To Date<input type="date" required min={form.from || policy?.today} value={form.to} disabled={busy} onChange={e => setForm({ ...form, to: e.target.value })} /></label>
        <label className="leave-form-wide">Reason for Leave<textarea required rows={3} maxLength={1000} placeholder="Why do you need leave?" value={form.reason} disabled={busy} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
        <p className="leave-duration" aria-live="polite">{dayError || (form.to && form.from && form.to < form.from ? "The end date must be on or after the start date." : days != null ? `${days} working ${days === 1 ? "day" : "days"}. Weekly offs and configured holidays are excluded.` : form.from && form.to ? "Calculating leave days…" : "Choose your first and last day of leave.")}</p>
        <div className="leave-form-footer"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={busy || !policy || !days || !!dayError}><Icon>send</Icon>{busy ? "Submitting…" : "Submit Leave"}</button></div>
      </form>
    </section>}
    <section className="dashboard-card">
      <div className="card-header"><h2>{ownView ? "My Leave Requests" : "Employee Leave Requests"}</h2><button className="leave-text-button" disabled={busy || loading} onClick={() => setRevision(v => v + 1)}><Icon>refresh</Icon>Refresh</button></div>
      <div className="leave-toolbar">{!ownView && <label>Employee<input type="search" placeholder="Search name or employee code" value={search} onChange={e => setSearch(e.target.value)} /></label>}<label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{["All statuses", ...STATUSES].map(label => <option key={label}>{label}</option>)}</select></label></div>
      {loadError ? <div className="leave-empty" role="alert"><h3>Could not load leave requests</h3><p>{loadError}</p><button className="leave-text-button" onClick={() => setRevision(v => v + 1)}>Try Again</button></div> : <div className="leave-table-scroll"><table className="leave-table">
        <thead><tr>{[...(!ownView ? ["Employee"] : []), "Leave Type", "Dates", "Days", "Reason", "Status", "Reviewed By", "Action"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{!loading && visible.map(request => <tr key={request.id}>
          {!ownView && <td><strong>{request.employeeName}</strong><small>{request.employeeCode || "Supervisor"}</small></td>}
          <td>{request.type}</td><td>{dateLabel(request.from)} – {dateLabel(request.to)}</td><td>{request.days}</td><td className="leave-reason">{request.reason}{request.reviewNote && <small>Review: {request.reviewNote}</small>}</td>
          <td><span className={`leave-badge leave-status-${request.status.toLowerCase()}`}>{request.status}</span>{request.status === "Pending" && request.requiresAdmin && <small>Admin approval required</small>}</td>
          <td>{request.reviewerName ? <><strong>{request.reviewerName}</strong><small>{request.reviewerRole}{request.reviewedAt ? ` · ${new Date(request.reviewedAt).toLocaleString("en-IN")}` : ""}</small></> : "—"}</td>
          <td>{!ownView && request.canReview ? <div className="leave-row-actions">{["Approved", "Rejected"].map(decision => <button key={decision} className={`btn ${decision === "Approved" ? "btn-primary" : "btn-secondary"}`} disabled={busy} onClick={() => { setReview({ request, status: decision }); setReviewNote(""); setError(""); }}>{decision === "Approved" ? "Approve" : "Reject"}</button>)}</div> : request.canCancel ? <button className="leave-text-button" disabled={busy} onClick={() => act(() => api.put(`/leaves/${request.id}/cancel`), "Leave request cancelled.")}>Cancel Request</button> : "—"}</td>
        </tr>)}{(loading || !visible.length) && <tr><td colSpan={ownView ? 7 : 8}><div className="leave-empty"><Icon>event_note</Icon><h3>{loading ? "Loading leave requests…" : "No matching leave requests"}</h3><p>{!loading && (ownView ? "Your submitted requests will appear here." : "Requests from employees you can review will appear here.")}</p></div></td></tr>}</tbody>
      </table></div>}
    </section>
    {review && <section className="dashboard-card" ref={reviewRef}><div className="card-header"><h2>{review.status === "Approved" ? "Approve Leave" : "Reject Leave"}</h2></div><form className="leave-review-form" onSubmit={event => {
      event.preventDefault();
      if (review.status === "Rejected" && !reviewNote.trim()) { setError("Enter a reason for rejecting this leave."); return; }
      act(() => api.put(`/leaves/${review.request.id}/review`, { status: review.status, note: reviewNote.trim() }), `Leave ${review.status.toLowerCase()}.`);
    }}><p>{review.request.employeeName} · {dateLabel(review.request.from)} – {dateLabel(review.request.to)} · {review.request.days} working days</p><label>{review.status === "Rejected" ? "Reason for Rejection" : "Note (optional)"}<textarea value={reviewNote} disabled={busy} required={review.status === "Rejected"} onChange={e => setReviewNote(e.target.value)} maxLength={1000} /></label><div className="leave-row-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setReview(null)}>Back</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Confirm Decision"}</button></div></form></section>}
  </div>;
}
