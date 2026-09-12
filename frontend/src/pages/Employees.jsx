import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getEmployees,
  hydrateEmployees,
  updateEmployee,
  updateEmployeeStatus,
} from "../data/employees";

import { addActivity } from "../data/activityLog";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import { belongsToFirm } from "../utils/employeePortal";

/* =========================================
   Employee Filter (Inline Component)
========================================= */

const EmployeeFilter = ({
  search,
  setSearch,
  department,
  departmentOptions,
  setDepartment,
  status,
  setStatus,
  onReset,
}) => {
  return (
    <div className="employee-filter">

      {/* Search */}
      <div className="employee-search">
        <span className="material-symbols-outlined">
          search
        </span>

        <input
          type="text"
          placeholder="Search by employee name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Department */}
      <select
        className="employee-filter-select"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        <option value="">All Departments</option>
        {departmentOptions.map(name => <option key={name} value={name}>{name}</option>)}
      </select>

      {/* Status */}
      <select
        className="employee-filter-select"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      {/* Reset */}
      <button
        type="button"
        className="employee-reset-button"
        onClick={onReset}
      >
        <span className="material-symbols-outlined">
          restart_alt
        </span>

        Reset
      </button>

    </div>
  );
};


/* =========================================
   Employees Page
========================================= */

const Employees = () => {
  const { user, isAdmin } = useAuth();
  const canAddEmployee = isAdmin || user?.role === "SUPERVISOR";

  /* =========================================
     NAVIGATION
  ========================================= */

  const navigate = useNavigate();
  const { selectedFirm } = useFirm();

  /* =========================================
     EMPLOYEE DATA
  ========================================= */

  const [employeeRecords, setEmployees] = useState([]);
  const [loadedFirmCode, setLoadedFirmCode] = useState(null);
  const employees = useMemo(() => loadedFirmCode === selectedFirm?.code
    ? employeeRecords.filter(employee => belongsToFirm(employee, selectedFirm)) : [],
  [employeeRecords, loadedFirmCode, selectedFirm]);

  useEffect(() => {

    if (!selectedFirm?.code) return;

    let active = true;
    const loadEmployees = async () => {
      const records = await hydrateEmployees(selectedFirm.code);
      if (!active) return;
      setEmployees(records);
      setLoadedFirmCode(selectedFirm.code);
    };


    loadEmployees();
    return () => { active = false; };
  }, [selectedFirm?.code]);


  /* =========================================
     FILTER STATES
  ========================================= */

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");


  /* =========================================
     FILTER LOGIC
  ========================================= */

  const filteredEmployees = useMemo(() => {

    return employees.filter((employee) => {

      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        employee.name
          .toLowerCase()
          .includes(searchValue) ||
        employee.id
          .toLowerCase()
          .includes(searchValue);

      const matchesDepartment =
        department === "" ||
        employee.department === department;

      const matchesStatus =
        status === "" ||
        employee.status === status;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );
    });

  }, [employees, search, department, status]);


  /* =========================================
     SUMMARY CARDS
  ========================================= */

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) => employee.status === "Inactive"
  ).length;

  const departments = new Set(
    employees.map((employee) => employee.department)
  ).size;


  /* =========================================
     RESET FILTERS
  ========================================= */

  const handleResetFilters = () => {
    setSearch("");
    setDepartment("");
    setStatus("");
  };


  /* =========================================
     ADD EMPLOYEE
  ========================================= */

  const handleAddEmployee = () => {
    navigate("/employees/add");
  };

  const handleToggleStatus = async (employee) => {
  const nextActive = employee.status !== "Active";
  const nextStatus = nextActive ? "Active" : "Inactive";
  const action = nextActive ? "activate" : "deactivate";

  const confirmed = window.confirm(
    `Are you sure you want to ${action} ${employee.name}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await updateEmployeeStatus(
      employee.employeeCode || employee.id,
      nextActive
    );

    addActivity({
      icon: nextActive ? "person_check" : "person_off",
      title: `Employee ${nextStatus.toLowerCase()}`,
      description: `${employee.name} (${employee.id}) marked ${nextStatus}.`,
      path: "/employees",
    });

    setEmployees(getEmployees());
  } catch (error) {
    console.error("Failed to update employee status:", error);

    window.alert(
      error?.response?.data?.message ||
      error?.message ||
      "Failed to update employee status."
    );
  }
};


  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="employees-page">

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <div className="page-header">

        <div>
          <h1>Employees</h1>

          <p>
            Manage employee information and records.
          </p>
        </div>

        {canAddEmployee && <button
          type="button"
          className="primary-button"
          onClick={handleAddEmployee}
        >
          <span className="material-symbols-outlined">
            person_add
          </span>

          Add Employee
        </button>}

      </div>


      {/* =====================================
          SUMMARY CARDS
      ===================================== */}

      <div className="stats-grid attendance-stats employee-stats">
        <div className="dashboard-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <h2>{totalEmployees}</h2>
              <p>Total Employees</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <div>
              <h2>{activeEmployees}</h2>
              <p>Active</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-symbols-outlined">person_off</span>
            </div>
            <div>
              <h2>{inactiveEmployees}</h2>
              <p>Inactive</p>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <span className="material-symbols-outlined">apartment</span>
            </div>
            <div>
              <h2>{departments}</h2>
              <p>Departments</p>
            </div>
          </div>
        </div>

      </div>


      {/* =====================================
          EMPLOYEE CARD
      ===================================== */}

      <div className="dashboard-card employee-card">

        {/* Filter */}
        <EmployeeFilter
          departmentOptions={[...new Set(employees.map(employee => employee.department).filter(Boolean))].sort()}
          search={search}
          setSearch={setSearch}

          department={department}
          setDepartment={setDepartment}

          status={status}
          setStatus={setStatus}

          onReset={handleResetFilters}
        />


        {/* ===================================
            EMPLOYEE TABLE
        =================================== */}

        <div className="employee-table-wrapper">

          <table className="employee-table">

            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Contact</th>
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>


            <tbody>

              {filteredEmployees.length > 0 ? (

                filteredEmployees.map((employee) => (

                  <tr key={employee.id}>

                    <td>
                      <button
                        type="button"
                        className="employee-id-button"
                        onClick={() => navigate(`/employees/${encodeURIComponent(employee.employeeCode || employee.id)}`)}
                        aria-label={`View profile for employee ${employee.employeeCode || employee.id}`}
                      >
                        <span className="employee-id-icon" aria-hidden="true">
                          <span className="material-symbols-outlined">badge</span>
                        </span>
                        <span className="employee-id-content">
                          <strong>{employee.employeeCode || employee.id}</strong>
                          <small>View profile</small>
                        </span>
                        <span className="material-symbols-outlined employee-id-arrow" aria-hidden="true">
                          chevron_right
                        </span>
                      </button>
                    </td>

                    <td>
                      {employee.name}
                    </td>

                    <td>
                      {employee.department}
                    </td>

                    <td>
                      {employee.designation}
                    </td>

                    <td>
                      {employee.contact}
                    </td>

                    <td>

                      <span
                        className={`status-badge ${
                          employee.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {employee.status}
                      </span>

                    </td>

                    {isAdmin && <td>
                      <div className="employee-actions">
                        <button
                          type="button"
                          className="employee-edit-button"
                          onClick={() => navigate(`/employees/${employee.id}/edit`)}
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="employee-status-button"
                          onClick={() => handleToggleStatus(employee)}
                        >
                          {employee.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>}

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="employee-empty-state"
                  >

                    <span className="material-symbols-outlined">
                      search_off
                    </span>

                    <h3>
                      No employees found
                    </h3>

                    <p>
                      Try changing your search or filter options.
                    </p>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};


export default Employees;
