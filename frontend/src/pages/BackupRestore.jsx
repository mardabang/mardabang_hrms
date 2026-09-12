import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useFirm } from "../context/FirmContext";
import "../styles/backup-restore.css";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const Banner = ({ type, message, onDismiss }) => {
  if (!message) return null;
  const icon = type === "success" ? "check_circle" : "error";
  return (
    <div className={`backup-banner backup-banner-${type}`} role={type === "error" ? "alert" : "status"}>
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="backup-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      )}
    </div>
  );
};

const BackupRestore = () => {
  const navigate = useNavigate();
  const { selectedFirm } = useFirm();
  const fileInputRef = useRef(null);

  const [success, setSuccess] = useState("");
  const [createError, setCreateError] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [backups, setBackups] = useState([]);
  const [version, setVersion] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);

  const hasFirm = Boolean(selectedFirm?.code);
  const busy = creating || uploading;
  const sortedBackups = useMemo(() => [...backups].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)), [backups]);
  const visibleBackups = sortedBackups.filter(backup => `${backup.note || ""} ${backup.version || ""} ${formatDateTime(backup.createdAt)}`.toLowerCase().includes(search.trim().toLowerCase()));

  const loadBackups = async () => {
    try {
      setLoadingBackups(true);
      setHistoryError("");
      const res = await api.get("/backup/list");
      setBackups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistoryError("Could not load backup history. Please try again.");
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackups();
    api.get("/version")
      .then((res) => setVersion(typeof res.data === "string" ? res.data : res.data?.version || ""))
      .catch(() => {});
  }, []);

  const createBackup = async () => {
    if (!hasFirm || busy) return;
    setCreateError("");
    try {
      setCreating(true);
      await api.post("/backup/create", { firmCode: selectedFirm.code, note });
      setNote("");
      await loadBackups();
      setSuccess("Backup created successfully.");
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Backup could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const selectFile = (selected) => {
    setRestoreError("");
    if (selected && !selected.name.toLowerCase().endsWith(".sql")) {
      setRestoreError("Please choose a .sql backup file.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(selected);
  };
  const handleFileSelect = event => selectFile(event.target.files?.[0] || null);
  const handleDrop = event => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    if (event.dataTransfer.files.length !== 1) { setRestoreError("Please choose one backup file at a time."); return; }
    selectFile(event.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setRestoreError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadBackup = async () => {
    if (!file || !hasFirm || busy) return;
    const confirmed = window.confirm(
      "Restoring will overwrite current data for this firm with the contents of the uploaded file. This cannot be undone.\n\nContinue?"
    );
    if (!confirmed) return;

    setRestoreError("");
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("firmCode", selectedFirm.code);
      await api.post("/backup/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearFile();
      await loadBackups();
      setSuccess("Data restored successfully.");
    } catch (err) {
      setRestoreError(err?.response?.data?.message || "Restore failed. Check the file and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="settings-page backup-restore-page">
      <div className="page-header">
        <div><h1>Backup &amp; Restore</h1><p>Create a backup of your data or restore an existing backup file.</p></div>
        <button className="btn btn-secondary" onClick={() => navigate("/settings")}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Back to Settings</button>
      </div>

      <section className="backup-context" aria-label="Backup information">
        <div className="backup-context-firm"><span className="backup-context-icon material-symbols-outlined" aria-hidden="true">business</span><div><span>Selected Firm</span><strong>{selectedFirm?.name || selectedFirm?.code || "No firm selected"}</strong>{selectedFirm?.name && <small>{selectedFirm.code}</small>}</div></div>
        <div><span>Latest Backup</span><strong>{loadingBackups ? "Loading..." : historyError ? "Not available" : sortedBackups.length ? formatDateTime(sortedBackups[0].createdAt) : "No backups yet"}</strong></div>
        <div><span>Application Version</span><strong>{version || "Not available"}</strong></div>
      </section>

      <Banner type="success" message={success} onDismiss={() => setSuccess("")} />
      {!hasFirm && <Banner type="error" message="Select a firm from the top bar before creating or restoring a backup." />}

      <div className="backup-grid">
        <section className="dashboard-card backup-card">
          <div className="backup-card-header"><span className="backup-card-icon material-symbols-outlined" aria-hidden="true">backup</span><div><h3>Create Backup</h3><p>Keep a copy of your current data.</p></div></div>
          <div className="backup-card-body">
            <p className="backup-description">Create a backup before making important changes to your records.</p>
            <div className="backup-field"><label htmlFor="backup-note">Backup Note <span className="backup-optional">(optional)</span></label><textarea id="backup-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Add a note to help you identify this backup" rows={4} maxLength={200} disabled={busy} /><div className="backup-field-help"><span>A short note makes backups easier to find.</span><span>{note.length}/200</span></div></div>
            <Banner type="error" message={createError} onDismiss={() => setCreateError("")} />
          </div>
          <div className="backup-card-footer"><span className="backup-footer-note"><span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>Appears in backup history</span><button className="primary-button backup-action-btn" onClick={createBackup} disabled={busy || !hasFirm}><span className={creating ? "material-symbols-outlined backup-spin" : "material-symbols-outlined"} aria-hidden="true">{creating ? "progress_activity" : "add"}</span>{creating ? "Creating..." : "Create Backup"}</button></div>
        </section>

        <section className="dashboard-card backup-card">
          <div className="backup-card-header"><span className="backup-card-icon material-symbols-outlined" aria-hidden="true">settings_backup_restore</span><div><h3>Restore Backup</h3><p>Restore your data from a saved file.</p></div></div>
          <div className="backup-card-body">
            <input ref={fileInputRef} id="restore-file" type="file" accept=".sql" onChange={handleFileSelect} disabled={busy} hidden aria-label="Choose SQL backup file" />
            <div className={dragging ? "backup-upload-area is-dragging" : "backup-upload-area"} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={handleDrop}>
              {file ? <div className="backup-file-chip"><span className="material-symbols-outlined" aria-hidden="true">description</span><div className="backup-file-chip-info"><strong>{file.name}</strong><span>{formatBytes(file.size)} / SQL backup</span><button type="button" className="backup-text-button" disabled={busy} onClick={() => fileInputRef.current?.click()}>Choose a different file</button></div><button type="button" className="backup-file-chip-remove" disabled={busy} onClick={clearFile} aria-label="Remove selected file"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div> : <button type="button" className="backup-dropzone" disabled={busy} onClick={() => fileInputRef.current?.click()}><span className="material-symbols-outlined" aria-hidden="true">upload_file</span><strong>Choose a backup file</strong><span>or drag and drop it here</span><small>SQL files only (.sql)</small></button>}
            </div>
            <p className="backup-restore-notice"><span className="material-symbols-outlined" aria-hidden="true">info</span>Restoring replaces existing data. Keep a current backup before you continue.</p>
            <Banner type="error" message={restoreError} onDismiss={() => setRestoreError("")} />
          </div>
          <div className="backup-card-footer"><span className="backup-footer-note">{file ? "File ready to restore" : "Choose a file to continue"}</span><button className="primary-button backup-action-btn" onClick={uploadBackup} disabled={busy || !file || !hasFirm}><span className={uploading ? "material-symbols-outlined backup-spin" : "material-symbols-outlined"} aria-hidden="true">{uploading ? "progress_activity" : "settings_backup_restore"}</span>{uploading ? "Restoring..." : "Restore Backup"}</button></div>
        </section>
      </div>

      <section className="dashboard-card backup-history-card">
        <div className="card-header"><div className="backup-history-title"><h3>Backup History</h3>{!loadingBackups && !historyError && <span className="backup-count">{backups.length}</span>}</div><button className="backup-text-button" onClick={loadBackups} disabled={loadingBackups || busy}><span className={loadingBackups ? "material-symbols-outlined backup-spin" : "material-symbols-outlined"} aria-hidden="true">refresh</span>Refresh</button></div>
        <div className="backup-history-toolbar"><label className="backup-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input type="search" aria-label="Search backup history" placeholder="Search by note, date, or version" value={search} onChange={event => setSearch(event.target.value)} /></label><span>Newest first</span></div>
        <div className="backup-table-scroll"><table className="backup-table"><thead><tr><th scope="col">Created On</th><th scope="col">Version</th><th scope="col">Backup Note</th></tr></thead><tbody>
          {loadingBackups ? <tr><td colSpan="3"><div className="backup-empty" role="status"><span className="material-symbols-outlined backup-spin" aria-hidden="true">progress_activity</span><p>Loading backup history...</p></div></td></tr> : historyError ? <tr><td colSpan="3"><div className="backup-empty" role="alert"><span className="material-symbols-outlined" aria-hidden="true">cloud_off</span><h4>History is unavailable</h4><p>{historyError}</p><button className="backup-text-button" onClick={loadBackups}>Try Again</button></div></td></tr> : visibleBackups.length ? visibleBackups.map(backup => <tr key={backup.id}><td><span className="backup-history-date"><span className="material-symbols-outlined" aria-hidden="true">calendar_today</span>{formatDateTime(backup.createdAt)}</span></td><td><span className="backup-version-pill">{backup.version || "Not available"}</span></td><td className="backup-note-cell">{backup.note || <span className="backup-muted">No note added</span>}</td></tr>) : <tr><td colSpan="3"><div className="backup-empty"><span className="material-symbols-outlined" aria-hidden="true">{search ? "search_off" : "inventory_2"}</span><h4>{search ? "No matching backups" : "No backups yet"}</h4><p>{search ? "Try another search or clear the filter." : "Your backups will appear here after you create one."}</p>{search && <button className="backup-text-button" onClick={() => setSearch("")}>Clear Search</button>}</div></td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
};

export default BackupRestore;
