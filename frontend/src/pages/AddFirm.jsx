import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const AddFirm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    code: "",
    name: "",
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setLoading(true);
    setError("");

    await api.post("/firms", {
      code: form.code,
      name: form.name,
      active: form.active,
    });

    navigate("/");
  } catch (err) {
    setError(err?.response?.data?.message || "Failed to add firm.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Add Firm</h1>
          <p>Create a new company for the HRMS.</p>
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

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Saving..." : "Save Firm"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddFirm;