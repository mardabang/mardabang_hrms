import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActivityLog, subscribeToActivities } from "../data/activityLog";

const Activity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState(getActivityLog);

  useEffect(() => subscribeToActivities(setActivities), []);

  return (
    <div className="activity-page">
      <div className="page-header">
        <div>
          <h1>Activity</h1>
          <p>Review recent changes across your HRMS.</p>
        </div>
      </div>

      <div className="activity-page-list">
        {activities.map((activity) => (
          <button
            type="button"
            className="activity-page-item"
            key={activity.id}
            onClick={() => navigate(activity.path)}
          >
            <span className="activity-page-icon material-symbols-outlined">{activity.icon}</span>
            <span className="activity-page-content">
              <strong>{activity.title}</strong>
              <span>{activity.description}</span>
              <small>{activity.time}</small>
            </span>
            <span className="material-symbols-outlined activity-page-arrow">chevron_right</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Activity;
