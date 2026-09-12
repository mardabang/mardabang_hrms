import React, { useEffect, useMemo, useState } from "react";
import { getEmployees, hydrateEmployees } from "../data/employees";
import { useFirm } from "../context/FirmContext";
import api from "../api/axios";
import * as XLSX from "xlsx";

const reportDefinitions = [
  {
    id: "monthly-presenty",
    title: "Monthly Presenty",
    description:
      "The full attendance grid for a month, plus a P/A/H/PL/WO summary per employee.",
    icon: "calendar_month",
  },
  {
    id: "salary-summary",
    title: "Firm Salary Summary",
    description:
      "Finalized payslip totals for every employee in a given month, with an Excel export.",
    icon: "payments",
  },
  {
    id: "ledger",
    title: "Ledger Report",
    description:
      "Salary payments, bonuses, advances and loans, with outstanding balances.",
    icon: "account_balance",
  },
  {
    id: "directory",
    title: "Employee Directory Export",
    description:
      "Pick exactly which fields to include, from names only to full bank details.",
    icon: "badge",
  },
  {
    id: "yearly",
    title: "Employee Yearly Report",
    description:
      "12-month attendance and salary history for one employee.",
    icon: "summarize",
  },
];

const getDaysInMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const formatDate = (date) => {
  if (!date) return "";
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return date;
  const [, year, month, day] = match;
  return `${day}/${month}/${year.slice(-2)}`;
};

const getAttendanceLabel = (status) => {
  switch (status) {
    case "PRESENT":
      return "P";
    case "LATE":
      return "L";
    case "COMPLETED":
      return "P";
    case "ABSENT":
      return "A";
    case "PAID_LEAVE":
      return "PL";
    case "WEEKLY_OFF":
      return "WO";
    case "HOLIDAY":
      return "H";
    case "PENDING":
      return "-";
    default:
      return "-";
  }
};

const getEmployeeCode = (employee) =>
  employee?.employeeCode || employee?.code || employee?.id || "";

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const directoryFieldDefinitions = [
  { key: "employeeCode", label: "Employee ID", category: "Basic", getValue: (e) => getEmployeeCode(e), default: true },
  { key: "name", label: "Name", category: "Basic", getValue: (e) => e.name, default: true },
  { key: "department", label: "Department", category: "Basic", getValue: (e) => e.department, default: true },
  { key: "designation", label: "Designation", category: "Basic", getValue: (e) => e.designation, default: true },
  { key: "contact", label: "Contact", category: "Basic", getValue: (e) => e.contact, default: true },
  { key: "email", label: "Email", category: "Basic", getValue: (e) => e.email, default: false },
  { key: "gender", label: "Gender", category: "Basic", getValue: (e) => e.gender, default: false },
  { key: "dateOfBirth", label: "Date of Birth", category: "Basic", getValue: (e) => formatDate(e.dateOfBirth), default: false },
  { key: "address", label: "Address", category: "Basic", getValue: (e) => e.address, default: false },
  { key: "status", label: "Status", category: "Basic", getValue: (e) => e.status, default: true },
  { key: "employmentType", label: "Employment Type", category: "Employment", getValue: (e) => e.employmentType, default: false },
  { key: "joiningDate", label: "Joining Date", category: "Employment", getValue: (e) => formatDate(e.joiningDate), default: false },
  { key: "wageType", label: "Wage Type", category: "Salary", getValue: (e) => e.wageType, default: false },
  { key: "monthlySalary", label: "Salary", category: "Salary", getValue: (e) => numberValue(e.monthlySalary), default: false },
  { key: "paymentMode", label: "Payment Mode", category: "Salary", getValue: (e) => e.paymentMode, default: false },
  { key: "bankName", label: "Bank Name", category: "Bank", getValue: (e) => e.bankName, default: false },
  { key: "accountNumber", label: "Account Number", category: "Bank", getValue: (e) => e.accountNumber, default: false },
  { key: "ifscCode", label: "IFSC Code", category: "Bank", getValue: (e) => e.ifscCode, default: false },
  { key: "aadharNumber", label: "Aadhaar Number", category: "KYC", getValue: (e) => e.aadharNumber, default: false },
  { key: "panNumber", label: "PAN Number", category: "KYC", getValue: (e) => e.panNumber, default: false },
];

const Reports = () => {
  const { selectedFirm: firm } = useFirm();

  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingSalary, setLoadingSalary] = useState(false);

  // Full-year attendance, only fetched when the Yearly Report is open
  const [yearlyAttendanceRecords, setYearlyAttendanceRecords] = useState([]);
  const [loadingYearlyAttendance, setLoadingYearlyAttendance] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [activeReportId, setActiveReportId] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [selectedDirectoryFields, setSelectedDirectoryFields] = useState(
    directoryFieldDefinitions.filter((f) => f.default).map((f) => f.key)
  );

  const toggleDirectoryField = (key) => {
    setSelectedDirectoryFields((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  };

  const [advanceLoanSummary, setAdvanceLoanSummary] = useState({ advance: 0, loan: 0, outstanding: 0 });
  const [advanceLoanTransactions, setAdvanceLoanTransactions] = useState([]);
  const [loadingAdvanceLoan, setLoadingAdvanceLoan] = useState(false);

  /* =========================================
     LOAD EMPLOYEES
  ========================================= */

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        await hydrateEmployees(firm?.code);
        const loadedEmployees = getEmployees();
        setEmployees(loadedEmployees);

        console.log('EMPLOYEES:', loadedEmployees);

        if (loadedEmployees.length > 0) {
          setSelectedEmployeeId(
            String(loadedEmployees[0]?.id || loadedEmployees[0]?.employeeCode || "")
          );
        }
      } catch (error) {
        console.error("Failed to load employees:", error);
      }
    };

    loadEmployees();
  }, [firm?.code]);

  /* =========================================
     LOAD ATTENDANCE FOR SELECTED MONTH
  ========================================= */

  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedMonth) return;

      setLoadingAttendance(true);
      setErrorMessage("");

      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDayNumber = getDaysInMonth(new Date(year, month - 1, 1));
        const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

        const response = await api.get("/attendance/range", {
          params: {
            from: firstDay,
            to: lastDay,
            ...(firm?.code ? { firmCode: firm.code } : {}),
          },
        });

        setAttendanceRecords(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load attendance report:", error);
        setAttendanceRecords([]);
        setErrorMessage(
          error?.response?.data?.message || "Unable to load attendance report."
        );
      } finally {
        setLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, [selectedMonth, firm?.code]);

  /* =========================================
     LOAD FULL-YEAR ATTENDANCE (Yearly Report only)
  ========================================= */

  useEffect(() => {
    const loadYearlyAttendance = async () => {
      if (activeReportId !== "yearly") return;

      const [year] = selectedMonth.split("-").map(Number);
      if (!year) return;

      setLoadingYearlyAttendance(true);
      try {
        const response = await api.get("/attendance/range", {
          params: {
            from: `${year}-01-01`,
            to: `${year}-12-31`,
            ...(firm?.code ? { firmCode: firm.code } : {}),
          },
        });
        setYearlyAttendanceRecords(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load yearly attendance report:", error);
        setYearlyAttendanceRecords([]);
      } finally {
        setLoadingYearlyAttendance(false);
      }
    };

    loadYearlyAttendance();
  }, [activeReportId, selectedMonth, firm?.code]);

  /* =========================================
     LOAD SALARY RECORDS
  ========================================= */

  useEffect(() => {
    const loadSalaryRecords = async () => {
      setLoadingSalary(true);

      try {
        const response = await api.get("/payroll/payments", {
          params: firm?.code ? { firmCode: firm.code } : {},
        });

        setSalaryRecords(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load salary records:", error);
        setSalaryRecords([]);
      } finally {
        setLoadingSalary(false);
      }
    };

    loadSalaryRecords();
  }, [firm?.code]);

  const selectedEmployee = employees.find(
    (employee) =>
      String(employee?.id || employee?.employeeCode || "") ===
      String(selectedEmployeeId)
  );

  /* =========================================
     LOAD ADVANCE/LOAN DATA (Ledger Report only)
  ========================================= */

  useEffect(() => {
  const loadAdvanceLoan = async () => {
    if (activeReportId !== "ledger" || !selectedEmployee?.employeeDbId) {
      setAdvanceLoanSummary({ advance: 0, loan: 0, outstanding: 0 });
      setAdvanceLoanTransactions([]);
      return;
    }

    const employeeId = selectedEmployee.employeeDbId;

    setLoadingAdvanceLoan(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.get("/payroll/credits/outstanding", { params: { employeeId } }),
        api.get("/payroll/credits/history", { params: { employeeId } }),
      ]);

      setAdvanceLoanSummary({
        advance: numberValue(summaryRes.data?.advance),
        loan: numberValue(summaryRes.data?.loan),
        outstanding: numberValue(summaryRes.data?.outstanding),
      });

      const rows = (Array.isArray(historyRes.data) ? historyRes.data : []).map((entry) => {
        const isIssue = entry.type === "ADVANCE_ISSUED" || entry.type === "LOAN_ISSUED";
        return {
          id: `credit-${entry.id}`,
          date: entry.date,
          type: entry.type === "ADVANCE_ISSUED" ? "Advance"
              : entry.type === "LOAN_ISSUED" ? "Loan"
              : entry.source === "PAYROLL_AUTO" ? "Repayment (Auto)"
              : "Repayment",
          description: entry.description || (isIssue ? "Issued" : "Repayment"),
          credit: isIssue ? 0 : numberValue(entry.amount),
          debit: isIssue ? numberValue(entry.amount) : 0,
        };
      });

      setAdvanceLoanTransactions(rows);
    } catch (error) {
      console.error("Failed to load advance/loan data:", error);
      setAdvanceLoanSummary({ advance: 0, loan: 0, outstanding: 0 });
      setAdvanceLoanTransactions([]);
    } finally {
      setLoadingAdvanceLoan(false);
    }
  };

  loadAdvanceLoan();
}, [activeReportId, selectedEmployee]);

  /* =========================================
     ACTIVE REPORT
  ========================================= */

  const activeReport = reportDefinitions.find(
    (report) => report.id === activeReportId
  );

  /* =========================================
     ATTENDANCE MAP
  ========================================= */

  const attendanceMap = useMemo(() => {
    const map = {};

    attendanceRecords.forEach((record) => {
      const employeeCode = String(record.employeeCode || "");
      const date = record.attendanceDate;

      if (!employeeCode || !date) {
        return;
      }

      if (!map[employeeCode]) {
        map[employeeCode] = {};
      }

      map[employeeCode][date] = record;
    });

    return map;
  }, [attendanceRecords]);

  /* =========================================
     MONTHLY SALARY RECORDS
  ========================================= */

  const monthlySalaryRecords = useMemo(() => {
    if (!selectedMonth) {
      return [];
    }

    return salaryRecords.filter((record) => {
      if (!record?.salaryMonth) {
        return false;
      }

      return String(record.salaryMonth).startsWith(selectedMonth);
    });
  }, [salaryRecords, selectedMonth]);

  /* =========================================
     FIND SALARY FOR EMPLOYEE
     SalaryRecord.employeeId is the numeric database ID
     (Employee.id) — never the employee code. employeeDbId
     is preserved separately in mapEmployee specifically
     for this match.
  ========================================= */

  const findSalaryForEmployee = (employee) => {
    if (!employee) {
      return null;
    }

    const dbId = employee?.employeeDbId;

    if (dbId == null) {
      return null;
    }

    return (
      monthlySalaryRecords.find(
        (record) => String(record.employeeId) === String(dbId)
      ) || null
    );
  };

  /* =========================================
     LEDGER TRANSACTIONS
  ========================================= */

  const ledgerTransactions = useMemo(() => {
    if (!selectedEmployee) {
      return [];
    }

    const salaryRecord = findSalaryForEmployee(selectedEmployee);

    const transactions = [];

    if (salaryRecord) {
      if (numberValue(salaryRecord.netSalary) > 0) {
        transactions.push({
          id: `salary-${salaryRecord.id}`,
          date: salaryRecord.paymentDate || salaryRecord.salaryMonth,
          type: "Salary",
          description: "Salary payment",
          credit: numberValue(salaryRecord.netSalary),
          debit: 0,
        });
      }

      if (numberValue(salaryRecord.bonus) > 0) {
        transactions.push({
          id: `bonus-${salaryRecord.id}`,
          date: salaryRecord.salaryMonth,
          type: "Bonus",
          description: "Salary bonus",
          credit: numberValue(salaryRecord.bonus),
          debit: 0,
        });
      }

      if (numberValue(salaryRecord.deductions) > 0) {
        transactions.push({
          id: `deduction-${salaryRecord.id}`,
          date: salaryRecord.salaryMonth,
          type: "Deduction",
          description: "Salary deductions",
          credit: 0,
          debit: numberValue(salaryRecord.deductions),
        });
      }
    }

    const advanceLoanRows = advanceLoanTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date,
      type: tx.type,
      description: tx.description,
      credit: numberValue(tx.credit),
      debit: numberValue(tx.debit),
    }));

    return [...transactions, ...advanceLoanRows].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [selectedEmployee, monthlySalaryRecords, advanceLoanTransactions]);

  /* =========================================
     LEDGER ROWS
  ========================================= */

  const ledgerRows = useMemo(() => {
    let balance = 0;

    return ledgerTransactions.map((transaction) => {
      balance += transaction.credit;
      balance -= transaction.debit;

      return {
        ...transaction,
        balance,
      };
    });
  }, [ledgerTransactions]);

  /* =========================================
     LEDGER SUMMARY
  ========================================= */

  const ledgerSummary = useMemo(() => {
    if (!selectedEmployee) {
      return { advance: 0, loan: 0, outstanding: 0 };
    }
    return advanceLoanSummary;
  }, [selectedEmployee, advanceLoanSummary]);

  /* =========================================
     REPORT DATA
  ========================================= */

  const reportData = useMemo(() => {
    if (!activeReportId) {
      return null;
    }

    /* =========================================
       MONTHLY PRESENTY
    ========================================= */

    if (activeReportId === "monthly-presenty") {
      const [year, month] = selectedMonth.split("-").map(Number);

      const days = Array.from(
        { length: getDaysInMonth(new Date(year, month - 1, 1)) },
        (_, index) => ({
          number: index + 1,
          date: `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
        })
      );

      return {
        columns: [
          "Employee",
          "Employee ID",
          "Department",
          ...days.map((day) => formatDate(day.date)),
        ],

        rows: employees.map((employee) => {
          const employeeCode = String(getEmployeeCode(employee));

          return [
            employee.name,
            employeeCode,
            employee.department,
            ...days.map((day) => {
              const record = attendanceMap[employeeCode]?.[day.date];
              return record ? getAttendanceLabel(record.status) : "-";
            }),
          ];
        }),
      };
    }

    /* =========================================
       SALARY SUMMARY
    ========================================= */

    if (activeReportId === "salary-summary") {
      return {
        columns: [
          "Employee ID",
          "Employee",
          "Department",
          "Gross Salary",
          "Deductions",
          "Net Salary",
          "Status",
        ],

        rows: employees
          .filter((employee) => employee.status === "Active")
          .map((employee) => {
            const salaryRecord = findSalaryForEmployee(employee);

            if (!salaryRecord) {
              return [
                getEmployeeCode(employee),
                employee.name,
                employee.department,
                0,
                0,
                0,
                "Not Generated",
              ];
            }

            const gross =
              numberValue(salaryRecord.basicSalary) +
              numberValue(salaryRecord.overtimeAmount) +
              numberValue(salaryRecord.bonus);

            const deductions = numberValue(salaryRecord.deductions);
            const net = numberValue(salaryRecord.netSalary);

            return [
              getEmployeeCode(employee),
              employee.name,
              employee.department,
              gross,
              deductions,
              net,
              salaryRecord.paymentStatus || "PENDING",
            ];
          }),
      };
    }

    /* =========================================
       EMPLOYEE DIRECTORY
    ========================================= */

    if (activeReportId === "directory") {
      const activeFields = directoryFieldDefinitions.filter((f) =>
        selectedDirectoryFields.includes(f.key)
      );

      if (activeFields.length === 0) {
        return { columns: [], rows: [] };
      }

      return {
        columns: activeFields.map((f) => f.label),
        rows: employees.map((employee) => activeFields.map((f) => f.getValue(employee))),
      };
    }

    /* =========================================
       YEARLY REPORT
    ========================================= */

    if (activeReportId === "yearly") {
      const [selectedYear] = selectedMonth.split("-").map(Number);

      return {
        columns: [
          "Employee ID",
          "Employee",
          "Department",
          "Months Reported",
          "Present Days",
          "Leave Days",
          "Salary Months",
        ],

        rows: employees
          .filter((employee) => employee.status === "Active")
          .map((employee) => {
            const employeeCode = String(getEmployeeCode(employee));

            const employeeAttendance = yearlyAttendanceRecords.filter((record) => {
              if (String(record.employeeCode) !== employeeCode) {
                return false;
              }
              if (!record.attendanceDate) {
                return false;
              }
              return String(record.attendanceDate).startsWith(String(selectedYear));
            });

            const presentDays = employeeAttendance.filter(
              (record) =>
                record.status === "PRESENT" ||
                record.status === "COMPLETED" ||
                record.status === "LATE"
            ).length;

            const leaveDays = employeeAttendance.filter(
              (record) => record.status === "PAID_LEAVE"
            ).length;

            const employeeSalaryRecords = salaryRecords.filter((record) => {
              if (
                employee.employeeDbId == null ||
                String(record.employeeId) !== String(employee.employeeDbId)
              ) {
                return false;
              }

              return String(record.salaryMonth || "").startsWith(String(selectedYear));
            });

            const salaryMonths = new Set(
              employeeSalaryRecords.map((record) =>
                String(record.salaryMonth).substring(0, 7)
              )
            );

            const monthsReported = new Set(
              employeeAttendance.map((record) =>
                String(record.attendanceDate).substring(0, 7)
              )
            );

            return [
              getEmployeeCode(employee),
              employee.name,
              employee.department,
              monthsReported.size,
              presentDays,
              leaveDays,
              salaryMonths.size,
            ];
          }),
      };
    }

    return null;
  }, [
    activeReportId,
    employees,
    selectedMonth,
    attendanceMap,
    attendanceRecords,
    salaryRecords,
    yearlyAttendanceRecords,
    selectedDirectoryFields,
  ]);

  /* =========================================
     DOWNLOAD REPORT
  ========================================= */

  const downloadReport = () => {
    if (activeReportId === "ledger") {
      downloadLedger();
      return;
    }

    if (!reportData || !activeReport) {
      return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([
      reportData.columns,
      ...reportData.rows,
    ]);

    // Auto-size columns roughly, based on the longest value per column
    worksheet["!cols"] = reportData.columns.map((col, colIndex) => {
      const maxLen = Math.max(
        String(col ?? "").length,
        ...reportData.rows.map((row) => String(row[colIndex] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeReport.title.slice(0, 31));

    XLSX.writeFile(workbook, `${activeReport.id}-${selectedMonth}.xlsx`);
  };

  /* =========================================
     DOWNLOAD LEDGER
  ========================================= */

  const downloadLedger = () => {
    if (!selectedEmployee) {
      return;
    }

    const rows = [
      ["Date", "Type", "Description", "Credit", "Debit", "Balance"],
      ...ledgerRows.map((row) => [
        formatDate(row.date),
        row.type,
        row.description,
        row.credit,
        row.debit,
        row.balance,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");

    XLSX.writeFile(workbook, `ledger-${selectedEmployee.name}-${selectedMonth}.xlsx`);
  };

  /* =========================================
     REPORT CARD CLICK
  ========================================= */

  const handleReportClick = (reportId) => {
    setActiveReportId((current) => (current === reportId ? null : reportId));
  };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="reports-page">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate and review reports for the currently selected firm.</p>
        </div>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

      {/* REPORT CARDS */}
      <div className="reports-grid">
        {reportDefinitions.map((report) => (
          <button
            type="button"
            key={report.id}
            className={`report-card ${activeReportId === report.id ? "active" : ""}`}
            onClick={() => handleReportClick(report.id)}
          >
            <span className="report-card-icon material-symbols-outlined">
              {report.icon}
            </span>
            <span className="report-card-content">
              <strong>{report.title}</strong>
              <span>{report.description}</span>
            </span>
            <span className="report-card-action">
              {activeReportId === report.id ? "Close preview" : "Preview report"}
            </span>
          </button>
        ))}
      </div>

      {/* LEDGER REPORT */}
      {activeReportId === "ledger" && (
        <section className="ledger-report">
          <div className="ledger-header">
            <div className="ledger-title">
              <div className="ledger-title-icon">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <div>
                <h2>Ledger Report</h2>
                <p>Financial transaction history and outstanding balances.</p>
                <span className="ledger-firm">
                  {firm?.name || firm?.code || "Selected Firm"}
                </span>
              </div>
            </div>

            <div className="ledger-actions">
              <div className="ledger-field">
                <label htmlFor="ledger-employee">Employee</label>
                <select
                  id="ledger-employee"
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option
                      key={employee.id || employee.employeeCode}
                      value={employee.id || employee.employeeCode}
                    >
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn btn-primary ledger-download"
                onClick={downloadLedger}
                disabled={!selectedEmployee || loadingAdvanceLoan}
              >
                <span className="material-symbols-outlined">download</span>
                Download Excel
              </button>
            </div>
          </div>

          {!selectedEmployee ? (
            <div className="ledger-empty">
              <div className="ledger-empty-icon">
                <span className="material-symbols-outlined">person_search</span>
              </div>
              <h3>Select an employee</h3>
              <p>Select an employee above to view their ledger statement.</p>
            </div>
          ) : (
            <>
              <div className="ledger-employee-bar">
                <div className="ledger-avatar">
                  {selectedEmployee.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <span>Ledger statement for</span>
                  <strong>{selectedEmployee.name}</strong>
                  <small>
                    {getEmployeeCode(selectedEmployee)}
                    {selectedEmployee.department ? ` • ${selectedEmployee.department}` : ""}
                  </small>
                </div>
              </div>

              <div className="ledger-section-heading">
                <div>
                  <h3>Outstanding Balances</h3>
                  <p>Current advance and loan amounts for this employee.</p>
                </div>
              </div>

              <div className="ledger-summary-grid">
                <div className="ledger-summary-card">
                  <div className="ledger-summary-top">
                    <div className="ledger-summary-icon">
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <span className="ledger-summary-label">Advance</span>
                  </div>
                  <strong>₹{ledgerSummary.advance.toLocaleString("en-IN")}</strong>
                  <span className="ledger-summary-note">Outstanding advance</span>
                </div>

                <div className="ledger-summary-card">
                  <div className="ledger-summary-top">
                    <div className="ledger-summary-icon">
                      <span className="material-symbols-outlined">account_balance</span>
                    </div>
                    <span className="ledger-summary-label">Loan</span>
                  </div>
                  <strong>₹{ledgerSummary.loan.toLocaleString("en-IN")}</strong>
                  <span className="ledger-summary-note">Outstanding loan</span>
                </div>

                <div className="ledger-summary-card ledger-summary-total">
                  <div className="ledger-summary-top">
                    <div className="ledger-summary-icon">
                      <span className="material-symbols-outlined">account_balance_wallet</span>
                    </div>
                    <span className="ledger-summary-label">Total Outstanding</span>
                  </div>
                  <strong>₹{ledgerSummary.outstanding.toLocaleString("en-IN")}</strong>
                  <span className="ledger-summary-note">Amount currently outstanding</span>
                </div>
              </div>

              <div className="ledger-section-heading ledger-history-heading">
                <div>
                  <h3>Full Ledger Statement</h3>
                  <p>
                    Complete financial transaction history for{" "}
                    <strong>{selectedEmployee.name}</strong>.
                  </p>
                </div>
                <span className="ledger-count">{ledgerRows.length} Transactions</span>
              </div>

              <div className="ledger-table-card">
                <div className="ledger-table-wrapper">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th className="amount-column">Credit</th>
                        <th className="amount-column">Debit</th>
                        <th className="amount-column">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="ledger-no-data">
                            No salary transactions found for this employee and month.
                          </td>
                        </tr>
                      ) : (
                        ledgerRows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <span className="ledger-date">{formatDate(row.date)}</span>
                            </td>
                            <td>
                              <span className={`ledger-type ledger-type-${row.type.toLowerCase()}`}>
                                {row.type}
                              </span>
                            </td>
                            <td>
                              <div className="ledger-description">
                                <strong>{row.description}</strong>
                              </div>
                            </td>
                            <td className="amount-column credit">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN")}` : "₹0"}
                            </td>
                            <td className="amount-column debit">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN")}` : "₹0"}
                            </td>
                            <td className="amount-column balance">
                              ₹{row.balance.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="ledger-table-footer">
                  <span>
                    Showing {ledgerRows.length} transaction{ledgerRows.length !== 1 ? "s" : ""}
                  </span>
                  <span>
                    Current balance:
                    <strong>
                      ₹{(ledgerRows[ledgerRows.length - 1]?.balance || 0).toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* NORMAL REPORT PREVIEW */}
      {activeReportId && activeReportId !== "ledger" && reportData && activeReport && (
        <section className="dashboard-card report-preview-card">
          <div className="report-preview-header">
            <div className="report-preview-title">
              <span className="report-preview-icon material-symbols-outlined" aria-hidden="true">
                {activeReport.icon}
              </span>
              <div>
                <h2>{activeReport.title}</h2>
                <p>{activeReport.description}</p>
                <span className="ledger-firm">{firm?.name || firm?.code || "Selected Firm"}</span>
              </div>
            </div>

            <div className="report-preview-actions">
              {(activeReportId === "monthly-presenty" ||
                activeReportId === "salary-summary" ||
                activeReportId === "yearly") && (
                <label>
                  {activeReportId === "yearly" ? "Year" : "Month"}
                  {activeReportId === "yearly" ? (
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={selectedMonth.substring(0, 4)}
                      onChange={(event) => {
                        const year = event.target.value;
                        const currentMonth = selectedMonth.substring(5, 7) || "01";
                        setSelectedMonth(`${year}-${currentMonth}`);
                      }}
                    />
                  ) : (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                    />
                  )}
                </label>
              )}

              {(loadingAttendance || loadingSalary || loadingYearlyAttendance) && (
                <span>Loading...</span>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={downloadReport}
                disabled={loadingAttendance || loadingSalary || loadingYearlyAttendance}
              >
                <span className="material-symbols-outlined">download</span>
                Download CSV
              </button>
            </div>
          </div>

          {activeReportId === "directory" && (
            <div className="report-directory-fields">
              <h3>Choose fields to include</h3>
              {["Basic", "Employment", "Salary", "Bank", "KYC"].map((category) => (
                <div key={category} className="report-directory-group">
                  <p>
                    {category}
                  </p>
                  <div className="report-directory-options">
                    {directoryFieldDefinitions
                      .filter((f) => f.category === category)
                      .map((f) => (
                        <label
                          key={f.key}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDirectoryFields.includes(f.key)}
                            onChange={() => toggleDirectoryField(f.key)}
                          />
                          {f.label}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="report-preview-table-wrapper">
            <table className="report-preview-table">
              <thead>
                <tr>
                  {reportData.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={reportData.columns.length}>No data found.</td>
                  </tr>
                ) : (
                  reportData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((value, columnIndex) => (
                        <td key={`${rowIndex}-${columnIndex}`}>
                          {typeof value === "number" && columnIndex > 2
                            ? value.toLocaleString("en-IN")
                            : value}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default Reports;
