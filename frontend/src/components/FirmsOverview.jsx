import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const FirmsOverview = () => {
  const navigate = useNavigate();

  const [firms, setFirms] = useState([]);

  useEffect(() => {
    const loadFirms = async () => {
      try {
        const response = await api.get("/firms");
        setFirms(response.data);
      } catch (error) {
        console.error("Failed to load firms:", error);
      }
    };

    loadFirms();
  }, []);

  return (
    <section className="dashboard-card firms-card">
      <div className="card-header">
        <div>
          <h3>Firms</h3>
          <p className="firms-subtitle">MBIPL, MBQS, MSI and other firms</p>
        </div>

        <button
          type="button"
          className="btn btn-primary firms-add-button"
          onClick={() => navigate("/firms/add")}
        >
          <span className="material-symbols-outlined">add</span>
          Add Firm
        </button>
      </div>

      <div className="firms-table-wrapper">
        <table className="firms-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {firms.map((firm) => (
              <tr key={firm.id}>
                <td>{firm.code}</td>
                <td>{firm.name}</td>
                <td>
                  <span
                    className={`firm-status ${
                      firm.active ? "active" : "inactive"
                    }`}
                  >
                    {firm.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="firm-edit-button"
                    onClick={() => navigate(`/firms/edit/${firm.id}`)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FirmsOverview;