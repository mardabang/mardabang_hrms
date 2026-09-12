import React from "react";

const EmployeeFilter = ({
  search,
  setSearch,
  department,
  setDepartment,
  status,
  setStatus,
  onReset,
}) => {
  return (
    <div className="employee-filter">
      <div className="employee-search">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Search by employee name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <select
        className="employee-filter-select"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">All Departments</option>
        <option value="Engineering">Engineering</option>
        <option value="HR">HR</option>
        <option value="Production">Production</option>
        <option value="Finance">Finance</option>
      </select>

      <select
        className="employee-filter-select"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <button className="employee-reset-button" onClick={onReset}>
        <span className="material-symbols-outlined">restart_alt</span>
        Reset
      </button>
    </div>
  );
};

export default EmployeeFilter;