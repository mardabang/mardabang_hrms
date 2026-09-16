import React from "react";
import { useFirm } from "../context/FirmContext";
import useDepartments from "../hooks/useDepartments";

const EmployeeFilter = ({
  search,
  setSearch,
  department,
  setDepartment,
  status,
  setStatus,
  onReset,
}) => {
  const { selectedFirm } = useFirm();
  const { items: departments } = useDepartments(selectedFirm?.id, false);
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
        {departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
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