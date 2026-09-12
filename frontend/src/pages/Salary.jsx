import React, { useEffect, useMemo, useState } from "react";

import { useFirm } from "../context/FirmContext";

import { addActivity } from "../data/activityLog";

import api from "../api";

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const getInitials = (name) => String(name || "Employee")
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase();

const formatStatus = (status) => String(status || "Pending")
  .replaceAll("_", " ")
  .toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const Salary = () => {
  const { selectedFirm } = useFirm();

  const [selectedMonth, setSelectedMonth] = useState(
    () => {
      const today = new Date();
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
  );

  const [salaryRecords, setSalaryRecords] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(false);

  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [finalizing, setFinalizing] = useState(false);

  const [error, setError] = useState("");

  const [employeeError, setEmployeeError] = useState("");

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthValue = `${selectedMonth.getFullYear()}-${String(
    selectedMonth.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const changeMonth = (offset) => {
    setSelectedMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + offset,
          1
        )
    );
  };

  // --------------------------------------------------
  // Load employees
  // --------------------------------------------------

  const loadEmployees = async () => {
    try {
      setEmployeeLoading(true);
      setEmployeeError("");

      const response = await api.get("/employees", {
        params: selectedFirm?.code ? { firmCode: selectedFirm.code } : {},
      });

      const employeeList = Array.isArray(response.data)
        ? response.data
        : [];

      setEmployees(employeeList);
    } catch (err) {
      console.error("Failed to load employees:", err);

      setEmployeeError(
        "Employee details could not be loaded."
      );

      setEmployees([]);
    } finally {
      setEmployeeLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [selectedFirm?.code]);

  // --------------------------------------------------
  // Load all salary statuses so pending payroll can be finalized here.
  // --------------------------------------------------

  const loadSalaryRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/payroll/payments", {
        params: selectedFirm?.code ? { firmCode: selectedFirm.code } : {},
      });

      const records = Array.isArray(response.data)
        ? response.data
        : [];

      setSalaryRecords(records.filter((record) =>
        String(record?.salaryMonth || "").substring(0, 7) === monthValue.substring(0, 7)
      ));
    } catch (err) {
      console.error(
        "Failed to load salary records:",
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to load salary records.";

      setError(message);

      setSalaryRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaryRecords();
  }, [monthValue, selectedFirm?.code]);

  // --------------------------------------------------
  // Employee map
  // --------------------------------------------------

  const employeeMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      if (
        employee?.id !== undefined &&
        employee?.id !== null
      ) {
        map.set(String(employee.id), employee);
      }
    });

    return map;
  }, [employees]);

  // --------------------------------------------------
  // Salary rows
  // --------------------------------------------------

  const rows = useMemo(() => {
    return salaryRecords.map((record) => {
      const employee = employeeMap.get(
        String(record.employeeId)
      );

      return {
        salaryRecordId: record.id,

        employeeId: record.employeeId,

        employeeName:
          employee?.name ||
          [employee?.firstName, employee?.lastName]
            .filter(Boolean)
            .join(" ") ||
          null,

        employeeCode:
          employee?.employeeCode || null,

        department:
          employee?.department || null,

        salaryMonth: record.salaryMonth,

        monthlySalary: Number(
          record.monthlySalary || 0
        ),

        payrollDivisor:
          record.payrollDivisor,

        paidDays: Number(
          record.paidDays || 0
        ),

        overtimeHours: Number(
          record.overtimeHours || 0
        ),

        basicSalary: Number(
          record.basicSalary || 0
        ),

        overtimeAmount: Number(
          record.overtimeAmount || 0
        ),

        bonus: Number(
          record.bonus || 0
        ),

        deductions: Number(
          record.deductions || 0
        ),

        netSalary: Number(
          record.netSalary || 0
        ),

        paymentMode:
          record.paymentMode ||
          "BANK_TRANSFER",

        paymentStatus:
          record.paymentStatus ||
          "PENDING",

        paymentDate:
          record.paymentDate,

        transactionReference:
          record.transactionReference,
      };
    });
  }, [salaryRecords, employeeMap]);

  // --------------------------------------------------
  // Finalized rows
  // --------------------------------------------------

  const finalizedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.paymentStatus === "FINALIZED" || row.paymentStatus === "PAID"
      ),
    [rows]
  );

  // --------------------------------------------------
  // Finalize payroll
  // --------------------------------------------------

  const handleFinalizePayroll = async () => {
    if (!selectedFirm?.code) {
      window.alert("Please select a firm.");
      return;
    }

    if (rows.length === 0) {
      window.alert(
        `No salary records are available for ${monthLabel}.`
      );
      return;
    }

    try {
      setFinalizing(true);
      setError("");

      const response = await api.put(
        "/payroll/finalize",
        null,
        {
          params: {
            firmCode: selectedFirm.code,
            month: monthValue.substring(0, 7),
          },
        }
      );

      const finalizedRecords =
        Array.isArray(response.data)
          ? response.data
          : [];

      setSalaryRecords(finalizedRecords);

      addActivity({
        icon: "lock",
        title: "Salary finalized",
        description: `${monthLabel} payroll finalized for ${selectedFirm.code}.`,
        path: "/salary",
      });

      window.alert(
        `${monthLabel} payroll finalized successfully.`
      );
    } catch (err) {
      console.error(
        "Failed to finalize payroll:",
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to finalize payroll.";

      setError(message);

      window.alert(message);
    } finally {
      setFinalizing(false);
    }
  };

  const allFinalized =
    rows.length > 0 &&
    finalizedRows.length === rows.length;

  const payrollSummary = useMemo(() => rows.reduce(
    (totals, row) => ({
      baseSalary: totals.baseSalary + row.basicSalary,
      additions: totals.additions + row.overtimeAmount + row.bonus,
      deductions: totals.deductions + row.deductions,
      netSalary: totals.netSalary + row.netSalary,
    }),
    { baseSalary: 0, additions: 0, deductions: 0, netSalary: 0 }
  ), [rows]);

  const summaryCards = [
    { icon: "groups", label: "Employees", value: rows.length.toLocaleString("en-IN"), detail: `${finalizedRows.length} finalized` },
    { icon: "account_balance_wallet", label: "Base payroll", value: formatCurrency(payrollSummary.baseSalary), detail: "Before additions" },
    { icon: "add_chart", label: "Additions", value: formatCurrency(payrollSummary.additions), detail: "Overtime and bonus" },
    { icon: "payments", label: "Net payroll", value: formatCurrency(payrollSummary.netSalary), detail: `${formatCurrency(payrollSummary.deductions)} deductions`, accent: true },
  ];

  return (
    <div className="salary-page">

      {/* Page Header */}

      <div className="page-header">
        <div>
          <h1>Salary</h1>

          <p>
            Review attendance-based salary calculations and finalize monthly payroll.
          </p>
        </div>

        {/* <div className="salary-firm-chip">
          <span className="material-symbols-outlined" aria-hidden="true">apartment</span>
          <div>
            <small>Current firm</small>
            <strong>{selectedFirm ? `${selectedFirm.code} · ${selectedFirm.name || "Firm"}` : "No firm selected"}</strong>
          </div>
        </div> */}
      </div>

      {/* Salary Toolbar */}

      <div className="salary-toolbar dashboard-card">

        <div className="salary-month-navigation">

          <span className="salary-period-label">Payroll period</span>

          <button
            type="button"
            className="salary-nav-button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>

          <strong>
            {monthLabel}
          </strong>

          <button
            type="button"
            className="salary-nav-button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>

        </div>

        <div className="salary-toolbar-actions">

          <span className={`salary-finalization-progress ${allFinalized ? "is-complete" : ""}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{allFinalized ? "task_alt" : "schedule"}</span>
            {rows.length ? `${finalizedRows.length} of ${rows.length} finalized` : "No records"}
          </span>

          <button
            type="button"
            className="primary-button"
            onClick={handleFinalizePayroll}
            disabled={
              finalizing ||
              loading ||
              rows.length === 0 ||
              allFinalized
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">{finalizing ? "progress_activity" : "lock"}</span>
            {finalizing
              ? "Finalizing..."
              : allFinalized
              ? "Payroll Finalized"
              : "Finalize Payrolls"}
          </button>

        </div>

      </div>

      <div className="salary-summary-grid" aria-label={`${monthLabel} payroll summary`}>
        {summaryCards.map((card) => (
          <div key={card.label} className={`dashboard-card salary-summary-card${card.accent ? " salary-summary-card-accent" : ""}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{card.icon}</span>
            <div>
              <p>{card.label}</p>
              <h2>{loading ? "—" : card.value}</h2>
              <small>{card.detail}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Salary Note */}

      <div className="salary-note">
        <span className="material-symbols-outlined" aria-hidden="true">info</span>
        <p><strong>How this is calculated</strong>Salary includes attendance, overtime, bonuses, and statutory deductions. Payments are recorded separately.</p>
      </div>

      {/* Errors */}

      {error && (
        <div className="salary-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>{error}
        </div>
      )}

      {employeeError && (
        <div className="salary-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>{employeeError}
        </div>
      )}

      {/* Salary Table */}

      <div className="dashboard-card salary-table-card">

        <div className="salary-table-header">
          <div>
            <h2>Salary breakdown</h2>
            <p>{monthLabel} · {rows.length} {rows.length === 1 ? "employee" : "employees"}</p>
          </div>
          <span className="salary-record-count">{rows.length} records</span>
        </div>

        <div className="salary-table-wrapper">

          <table className="salary-table">

            <thead>
              <tr>
                <th>Employee</th>
                <th className="salary-number-column">Days Paid</th>
                <th className="salary-number-column">OT Hrs</th>
                <th className="salary-number-column">Base Salary</th>
                <th className="salary-number-column">OT Earnings</th>
                <th className="salary-number-column">Bonus</th>
                <th className="salary-number-column">Deductions</th>
                <th className="salary-number-column">Net Salary</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="9" className="salary-empty-state">
                    <span className="material-symbols-outlined salary-empty-icon" aria-hidden="true">progress_activity</span>
                    <strong>Loading salary records…</strong>
                    <small>Please wait while the payroll data is prepared.</small>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="salary-empty-state">
                    <span className="material-symbols-outlined salary-empty-icon" aria-hidden="true">receipt_long</span>
                    <strong>No salary records found</strong>
                    <small>There are no payroll records available for {monthLabel}.</small>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.salaryRecordId}
                  >

                    {/* Employee */}

                    <td>
                      <div className="salary-employee-cell">
                        <span className="salary-employee-avatar" aria-hidden="true">{getInitials(row.employeeName)}</span>
                        <div>
                          <strong>
                            {employeeLoading && !row.employeeName
                              ? "Loading…"
                              : row.employeeName || `Employee #${row.employeeId}`}
                          </strong>
                          <span>{row.employeeCode || `Employee ID #${row.employeeId}`}</span>
                          <span>{row.department || "Department not available"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Days Paid */}

                    <td className="salary-number-column">
                      {row.paidDays.toFixed(2)}
                    </td>

                    {/* OT Hours */}

                    <td className="salary-number-column">
                      {row.overtimeHours.toFixed(2)}
                    </td>

                    {/* Base Salary */}

                    <td className="salary-number-column">
                      {formatCurrency(
                        row.basicSalary
                      )}
                    </td>

                    {/* OT Amount */}

                    <td className="salary-number-column">
                      {formatCurrency(
                        row.overtimeAmount
                      )}
                    </td>

                    {/* Bonus */}

                    <td className="salary-number-column salary-positive-value">
                      {formatCurrency(
                        row.bonus
                      )}
                    </td>

                    {/* Deductions */}

                    <td className="salary-number-column salary-deduction-value">
                      {formatCurrency(
                        row.deductions
                      )}
                    </td>

                    {/* Net Salary */}

                    <td className="salary-number-column salary-net-value">
                      <strong>
                        {formatCurrency(
                          row.netSalary
                        )}
                      </strong>
                    </td>

                    {/* Status */}

                    <td>
                      <span
                        className={`salary-status salary-status-${String(
                          row.paymentStatus
                        ).toLowerCase()}`}
                      >
                        {formatStatus(row.paymentStatus)}
                      </span>
                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default Salary;
