import React from "react";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: "how_to_reg",
      title: "Mark",
      subtitle: "Attendance",
      primary: true,
      path: "/attendance",
    },
    {
      icon: "person_add",
      title: "Add",
      subtitle: "Employee",
      path: "/employees/add",
    },
    {
      icon: "payments",
      title: "Add",
      subtitle: "Payment",
      path: "/payments",
    },
    {
      icon: "visibility",
      title: "Preview",
      subtitle: "Salary",
      path: "/salary",
    },
    {
      icon: "summarize",
      title: "Generate",
      subtitle: "Report",
      path: "/reports",
    },
  ];

  const handleAction = (action) => {
    if (action.path) {
      navigate(action.path);
      return;
    }

    alert(`${action.title} ${action.subtitle} feature will be connected later.`);
  };

  return (
    <div className="quick-actions">

      <h3 className="section-label">
        Quick Actions
      </h3>

      <div className="quick-actions-grid">

        {actions.map((action) => (
          <button
            key={action.subtitle}
            className={`quick-action ${
              action.primary ? "primary-action" : ""
            }`}
            onClick={() => handleAction(action)}
          >

            <span className="material-symbols-outlined">
              {action.icon}
            </span>

            <span>
              {action.title}
              <br />
              {action.subtitle}
            </span>

          </button>
        ))}

      </div>

    </div>
  );
};

export default QuickActions;