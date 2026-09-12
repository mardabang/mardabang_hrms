import React from "react";
import { useNavigate } from "react-router-dom";

const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendType,
  to,
}) => {
  const navigate = useNavigate();
  const routes = {
    "Total Employees": "/employees",
    "Present Today": "/attendance",
    "Absent Today": "/attendance",
    "Not Marked Today": "/attendance",
  };

  return (
    <button
      type="button"
      className="stat-card stat-card-button"
      onClick={() => navigate(to || routes[title] || "/dashboard")}
    >

      <div className="stat-card-top">

        <div className="stat-icon">
          <span className="material-symbols-outlined">
            {icon}
          </span>
        </div>

        <div className={`stat-trend ${trendType}`}>
          {trendType === "up" && (
            <span className="material-symbols-outlined">
              trending_up
            </span>
          )}

          {trendType === "down" && (
            <span className="material-symbols-outlined">
              trending_down
            </span>
          )}

          {trendType === "neutral" && (
            <span className="material-symbols-outlined">
              horizontal_rule
            </span>
          )}

          {trend}
        </div>

      </div>

      <div className="stat-content">
        <h2>{value}</h2>
        <p>{title}</p>
      </div>

    </button>
  );
};

export default StatCard;
