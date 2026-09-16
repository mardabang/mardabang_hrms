import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";
import { useFirm } from "../context/FirmContext";
import useDepartments from "../hooks/useDepartments";
import "./Departments.css";

export default function Departments() {
  const { selectedFirm } = useFirm();
  const firmId = selectedFirm?.id;
  const currentFirm = useRef(firmId);
  currentFirm.current = firmId;
  const [revision, setRevision] = useState(0);
  const { items, loading, error: loadError } = useDepartments(firmId, false, revision);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setName(""); setEditing(null); setError(""); }, [firmId]);
  async function mutate(operation) {
    const startedFirm = firmId;
    setPending(true); setError("");
    try {
      await operation();
      if (currentFirm.current === startedFirm) { setRevision((value) => value + 1); setName(""); setEditing(null); }
    } catch (failure) {
      if (currentFirm.current === startedFirm) setError(failure.response?.data?.message || "Could not save the department. Please retry.");
    } finally { setPending(false); }
  }
  function save(event) {
    event.preventDefault();
    const cleaned = name.trim().replace(/\s+/g, " ");
    if (!cleaned || cleaned.length > 100) { setError("Enter a department name containing 1–100 characters."); return; }
    mutate(() => editing ? api.put(`/departments/${editing}`, { name: cleaned }) : api.post("/departments", { firmId, name: cleaned }));
  }
  return <div className="departments-page">
    <Link to="/settings" className="btn btn-secondary">Back to Settings</Link>
    <h1>Departments</h1>
    <p>Manage departments for {selectedFirm?.name || selectedFirm?.code || "the selected company"}. Inactive departments remain on existing employee records.</p>
    {!firmId ? <p>Select a company in the top bar to manage its departments.</p> : <>
      <form onSubmit={save} className="departments-form">
        <div className="form-group"><label htmlFor="department-name">Department name</label><input id="department-name" value={name} maxLength={100} required disabled={pending} onChange={(event) => setName(event.target.value)} placeholder="For example, Sizing" /></div>
        <button className="btn primary" disabled={pending || loading}>{pending ? "Saving…" : editing ? "Save name" : "Add department"}</button>
        {editing && <button type="button" className="btn" disabled={pending} onClick={() => { setEditing(null); setName(""); }}>Cancel</button>}
      </form>
      {(error || loadError) && <p role="alert" className="form-field-error">{error || loadError}</p>}
      {loadError && <button className="btn" disabled={pending} onClick={() => setRevision((value) => value + 1)}>Retry</button>}
      {loading ? <p role="status">Loading departments…</p> : <div className="departments-table"><table><thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {items.map((department) => <tr key={department.id}><td>{department.name}</td><td>{department.active ? "Active" : "Inactive"}</td><td>
          <button className="btn" disabled={pending} onClick={() => { setEditing(department.id); setName(department.name); setError(""); }}>Rename</button>
          <button className="btn" disabled={pending} onClick={() => mutate(() => department.active ? api.delete(`/departments/${department.id}`) : api.put(`/departments/${department.id}`, { active: true }))}>{department.active ? "Deactivate" : "Reactivate"}</button>
        </td></tr>)}
        {!items.length && !loadError && <tr><td colSpan={3}>No departments yet. Add the first department above.</td></tr>}
      </tbody></table></div>}
    </>}
  </div>;
}
