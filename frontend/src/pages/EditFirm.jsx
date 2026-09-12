import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

const EditFirm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    code: "",
    name: "",
    active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  const loadFirm = async () => {
    try {
      const response = await api.get(`/firms/${id}`);
      setForm(response.data);
    } catch (err) {
      setError("Unable to load firm.");
    } finally {
      setLoading(false);
    }
  };

  loadFirm();
}, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      await api.put(`/firms/${id}`, form);

      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update firm.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Edit Firm</h1>
          <p>Update firm details.</p>
        </div>
      </div>

      <form className="employee-card" onSubmit={handleSubmit}>
        <div className="employee-filter" style={{ flexDirection: "column", alignItems: "stretch" }}>

          <label>Firm Code</label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            required
          />

          <label>Firm Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Active
          </label>

          {error && <p className="attendance-validation-error">{error}</p>}

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
              Cancel
            </button>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Updating..." : "Update Firm"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditFirm;