import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import api from "../api/axios";

const STANDARD_HEADERS = [
  "Employee Code",
  "Employee Name",
  "Department",
  "Designation",
  "Joining Date",
  "Wage Type",
  "Monthly Salary",
  "Payment Mode",
  "Bank A/c No",
  "IFSC Code",
  "PF A/c No",
  "ESI A/c No",
  "Employee First Name",
  "Employee Last Name",
  "Gender",
  "Date of Birth",
  "Mobile Number",
  "Email",
  "Address",
  "Employment Type",
  "Bank Name",
  "Aadhaar Number",
  "PAN Number",
  "Status",
  "Active",
];

const REQUIRED_HEADERS = [
  "Employee Code",
  "Employee Name",
  "Department",
  "Designation",
  "Joining Date",
  "Wage Type",
  "Monthly Salary",
  "Payment Mode",
];

const TEMPLATE_ROWS = [
  [
    "EMP001",
    "Amit Patil",
    "Production",
    "Worker",
    "2026-07-01",
    "MONTHLY",
    25000,
    "BANK_TRANSFER",
    "100000001",
    "SBIN0001234",
    "PF001",
    "ESI001",
    "Amit",
    "Patil",
    "Male",
    "1992-05-12",
    "9876543210",
    "amit.patil@example.com",
    "Plot 12, Shivaji Nagar, Pune",
    "Full Time",
    "State Bank of India",
    "123456789012",
    "ABCDE1234F",
    "Active",
    "TRUE",
  ],
  [
    "EMP002",
    "Rahul Shinde",
    "Production",
    "Worker",
    "2026-07-05",
    "MONTHLY",
    28000,
    "BANK_TRANSFER",
    "100000002",
    "HDFC0001234",
    "PF002",
    "ESI002",
    "Rahul",
    "Shinde",
    "Male",
    "1994-08-18",
    "9988776655",
    "rahul.shinde@example.com",
    "Lane 4, Chinchwad, Pune",
    "Full Time",
    "HDFC Bank",
    "234567890123",
    "FGHIJ2345G",
    "Active",
    "TRUE",
  ],
  [
    "EMP003",
    "Sneha Joshi",
    "HR",
    "HR Executive",
    "2026-07-10",
    "MONTHLY",
    40000,
    "BANK_TRANSFER",
    "100000003",
    "ICIC0001234",
    "PF003",
    "ESI003",
    "Sneha",
    "Joshi",
    "Female",
    "1991-11-22",
    "9123456789",
    "sneha.joshi@example.com",
    "Flat 3, Wakad, Pune",
    "Full Time",
    "ICICI Bank",
    "345678901234",
    "KLMNO3456H",
    "Active",
    "TRUE",
  ],
];

const normalizeHeader = (value = "") =>
  String(value).trim().replace(/\s+/g, " ").toLowerCase();

const getCellValue = (row, fieldNames) => {
  const matchingKey = Object.keys(row).find((header) =>
    fieldNames.some((field) => normalizeHeader(header) === normalizeHeader(field))
  );

  return matchingKey !== undefined ? row[matchingKey] : "";
};

const parseDateValue = (rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeWageType = (value) => {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (["MONTHLY", "MONTH"].includes(normalized)) return "Monthly";
  if (["DAILY", "DAY"].includes(normalized)) return "Daily";
  return "";
};

const normalizePaymentMode = (value) => {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (["BANK_TRANSFER", "BANK TRANSFER", "BANK"].includes(normalized)) return "Bank";
  if (["CASH", "CASH_PAYMENT"].includes(normalized)) return "Cash";
  return "";
};

const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value ?? "").trim().toUpperCase());

const EmployeeImport = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
  });

  const processRows = (rows) => {
    if (!rows.length) {
      setErrors([{ row: "Header", message: "The uploaded file is empty." }]);
      setPreviewData([]);
      setSummary({ total: 0, valid: 0, invalid: 0 });
      return;
    }

    const headerMap = Object.keys(rows[0] || {}).reduce((accumulator, header) => {
      accumulator[normalizeHeader(header)] = header;
      return accumulator;
    }, {});

    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !headerMap[normalizeHeader(header)]
    );

    if (missingHeaders.length) {
      setErrors(
        missingHeaders.map((header) => ({
          row: "Header",
          message: `Missing column: ${header}`,
        }))
      );
      setPreviewData([]);
      setSummary({ total: 0, valid: 0, invalid: 0 });
      return;
    }

    const validationErrors = [];
    const usedCodes = new Set();
    let validRows = 0;

    const cleanedRows = rows.map((row, index) => {
      const employeeCode = String(getCellValue(row, ["Employee Code"]) || "").trim();
      const name = String(getCellValue(row, ["Employee Name", "Name"]) || "").trim();
      const department = String(getCellValue(row, ["Department"]) || "").trim();
      const designation = String(getCellValue(row, ["Designation"]) || "").trim();
      const joiningDate = String(getCellValue(row, ["Joining Date"]) || "").trim();
      const rawWageType = String(getCellValue(row, ["Wage Type"]) || "").trim();
      const rawMonthlySalary = getCellValue(row, ["Monthly Salary"]) ?? "";
      const rawPaymentMode = String(getCellValue(row, ["Payment Mode"]) || "").trim();
      const accountNumber = String(getCellValue(row, ["Bank A/c No", "Bank Account Number", "Account Number"]) || "").trim();
      const ifscCode = String(getCellValue(row, ["IFSC Code", "IFSC"]) || "").trim();
      const pfAccountNumber = String(getCellValue(row, ["PF A/c No", "PF Account Number", "PF Number"]) || "").trim();
      const esiAccountNumber = String(getCellValue(row, ["ESI A/c No", "ESI Account Number", "ESI Number"]) || "").trim();
      const firstName = String(getCellValue(row, ["Employee First Name", "First Name"]) || "").trim();
      const lastName = String(getCellValue(row, ["Employee Last Name", "Last Name"]) || "").trim();
      const gender = String(getCellValue(row, ["Gender"]) || "").trim();
      const dateOfBirth = String(getCellValue(row, ["Date of Birth", "DOB"]) || "").trim();
      const mobileNumber = String(getCellValue(row, ["Mobile Number", "Contact", "Phone Number"]) || "").trim();
      const email = String(getCellValue(row, ["Email"]) || "").trim();
      const address = String(getCellValue(row, ["Address"]) || "").trim();
      const employmentType = String(getCellValue(row, ["Employment Type"]) || "").trim();
      const bankName = String(getCellValue(row, ["Bank Name"]) || "").trim();
      const aadhaarNumber = String(getCellValue(row, ["Aadhaar Number"]) || "").trim();
      const panNumber = String(getCellValue(row, ["PAN Number"]) || "").trim();
      const importedStatus = String(getCellValue(row, ["Status"]) || "Active").trim();
      const active = String(getCellValue(row, ["Active"]) || "TRUE").trim().toLowerCase() !== "false";

      const wageType = normalizeWageType(rawWageType);
      const paymentMode = normalizePaymentMode(rawPaymentMode);
      const monthlySalaryNumber = Number(String(rawMonthlySalary).replace(/[,\s]/g, ""));
      const joiningDateParsed = parseDateValue(joiningDate);
      const rowNumber = index + 2;
      let rowStatus = "Valid";

      if (!employeeCode) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Employee Code is required." });
      } else if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(employeeCode.toUpperCase())) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Employee Code must be 2-20 characters using letters, numbers, or hyphens." });
      }

      if (!name) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Employee Name is required." });
      }

      if (dateOfBirth && !parseDateValue(dateOfBirth)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Date of Birth must be in YYYY-MM-DD format." });
      }

      if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Mobile Number must be a valid 10-digit number." });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Email format is invalid." });
      }

      if (gender && !["MALE", "FEMALE", "OTHER"].includes(gender.toUpperCase())) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Gender must be Male, Female, or Other." });
      }

      if (!department) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Department is required." });
      }

      if (!designation) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Designation is required." });
      }

      if (!joiningDate) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Joining Date is required." });
      } else if (!joiningDateParsed) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Joining Date must be in YYYY-MM-DD format." });
      }

      if (!rawWageType) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Wage Type is required." });
      } else if (!wageType) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Supported Wage Type values are MONTHLY or DAILY." });
      }

      if (rawMonthlySalary === "" || rawMonthlySalary === null || rawMonthlySalary === undefined) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Monthly Salary is required." });
      } else if (!Number.isFinite(monthlySalaryNumber) || monthlySalaryNumber <= 0) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Monthly Salary must be a valid number greater than zero." });
      }

      if (!rawPaymentMode) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Payment Mode is required." });
      } else if (!paymentMode) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Supported Payment Mode values are BANK_TRANSFER or CASH." });
      }

      if (paymentMode === "Bank") {
        if (!accountNumber) {
          rowStatus = "Error";
          validationErrors.push({ row: rowNumber, message: "Bank A/c No is required when Payment Mode is BANK_TRANSFER." });
        } else if (!/^\d{9,18}$/.test(accountNumber)) {
          rowStatus = "Error";
          validationErrors.push({ row: rowNumber, message: "Bank A/c No must contain 9 to 18 digits." });
        }

        if (!ifscCode) {
          rowStatus = "Error";
          validationErrors.push({ row: rowNumber, message: "IFSC Code is required when Payment Mode is BANK_TRANSFER." });
        } else if (!isValidIfsc(ifscCode)) {
          rowStatus = "Error";
          validationErrors.push({ row: rowNumber, message: "IFSC Code must be a valid format like SBIN0001234." });
        }
      }

      if (bankName && bankName.length < 2) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Bank Name must be at least 2 characters." });
      }

      if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Aadhaar Number must contain exactly 12 digits." });
      }

      if (panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "PAN Number format is invalid." });
      }

      if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Bank A/c No must contain only digits and be 9 to 18 characters long." });
      }

      if (ifscCode && !isValidIfsc(ifscCode)) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "IFSC Code format is invalid." });
      }

      if (pfAccountNumber && pfAccountNumber.length > 50) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "PF A/c No is too long." });
      }

      if (esiAccountNumber && esiAccountNumber.length > 50) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "ESI A/c No is too long." });
      }

      if (employeeCode && usedCodes.has(employeeCode.toUpperCase())) {
        rowStatus = "Error";
        validationErrors.push({ row: rowNumber, message: "Duplicate Employee Code found in the file." });
      } else if (employeeCode) {
        usedCodes.add(employeeCode.toUpperCase());
      }

      if (rowStatus === "Valid") validRows += 1;

      return {
        employeeCode: employeeCode.toUpperCase(),
        name,
        department,
        designation,
        firstName,
        lastName,
        gender: gender || "",
        dateOfBirth: dateOfBirth || "",
        contact: mobileNumber,
        email,
        address,
        employmentType,
        joiningDate,
        wageType,
        monthlySalary: Number.isFinite(monthlySalaryNumber) ? monthlySalaryNumber : 0,
        paymentMode,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        bankName,
        pfAccountNumber,
        esiAccountNumber,
        aadharNumber: aadhaarNumber,
        panNumber,
        status: rowStatus,
        active: active && rowStatus === "Valid",
        statusValue: rowStatus,
      };
    });

    setPreviewData(cleanedRows);
    setErrors(validationErrors);
    setSummary({
      total: rows.length,
      valid: validRows,
      invalid: rows.length - validRows,
    });
  };

  const handleDownloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([STANDARD_HEADERS, ...TEMPLATE_ROWS]);
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Import");
    XLSX.writeFile(workbook, "marda_hrms_employee_import_template.xlsx");
  };

  const handleCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => processRows(result.data),
    });
  };

  const handleExcel = (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      processRows(data);
    };

    reader.readAsBinaryString(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.name.toLowerCase().endsWith(".csv")) {
      handleCSV(file);
    } else if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
      handleExcel(file);
    } else {
      setErrors([{ row: "-", message: "Unsupported file format. Please upload CSV or Excel." }]);
      setPreviewData([]);
      setSummary({ total: 0, valid: 0, invalid: 0 });
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter((row) => row.status === "Valid");

    if (!validRows.length) {
      alert("No valid employee records are available to import.");
      return;
    }

    try {
      const payload = validRows.map((row) => ({
        employeeCode: row.employeeCode,
        name: row.name,
        firstName: row.firstName || row.name.split(" ")[0] || row.name,
        lastName: row.lastName || row.name.split(" ").slice(1).join(" ") || "",
        department: row.department,
        designation: row.designation,
        contact: row.contact || "",
        email: row.email || "",
        gender: row.gender || "",
        dateOfBirth: row.dateOfBirth || null,
        employmentType: row.employmentType || "Full Time",
        address: row.address || "",
        joiningDate: row.joiningDate,
        wageType: row.wageType,
        monthlySalary: Number(row.monthlySalary),
        paymentMode: row.paymentMode,
        accountNumber: row.accountNumber || "",
        ifscCode: row.ifscCode || "",
        bankName: row.bankName || "",
        pfAccountNumber: row.pfAccountNumber || "",
        esiAccountNumber: row.esiAccountNumber || "",
        aadharNumber: row.aadharNumber || "",
        panNumber: row.panNumber || "",
        active: row.active !== false,
        status: row.statusValue === "Valid" ? "Active" : "Inactive",
      }));

      const response = await api.post("/employees/import", payload);
      const { created = 0, updated = 0 } = response.data || {};

      alert(`${payload.length} employees processed: ${created} created, ${updated} updated.`);
      setPreviewData([]);
      setSelectedFile(null);
      setSummary({ total: 0, valid: 0, invalid: 0 });
      setErrors([]);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Employee import failed.");
    }
  };

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Employee Import</h1>
          <p>Import employee master data using the standard HRMS template.</p>
        </div>

        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate}>
            <span className="material-symbols-outlined">download</span>
            Download Import Template
          </button>

          <label className="btn btn-primary upload-btn">
            <span className="material-symbols-outlined">upload_file</span>
            Upload Excel/CSV
            <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <div className="employee-card">
        <div className="import-dropzone">
          <span className="material-symbols-outlined">upload_file</span>
          <h3>Upload Employee Spreadsheet</h3>
          <p>Use the standard employee template to import payroll-ready master records.</p>
          {selectedFile && (
            <div className="selected-file">
              <span className="material-symbols-outlined">description</span>
              {selectedFile.name}
            </div>
          )}
        </div>
      </div>

      {summary.total > 0 && (
        <div className="employee-summary-grid import-summary">
          <div className="summary-card">
            <span className="material-symbols-outlined">table_rows</span>
            <div>
              <h3>{summary.total}</h3>
              <p>Total Rows</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="material-symbols-outlined">check_circle</span>
            <div>
              <h3>{summary.valid}</h3>
              <p>Valid Rows</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="material-symbols-outlined">error</span>
            <div>
              <h3>{summary.invalid}</h3>
              <p>Error Rows</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="material-symbols-outlined">groups</span>
            <div>
              <h3>{summary.valid}</h3>
              <p>Ready to Import</p>
            </div>
          </div>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="employee-card">
          <div className="card-header">
            <h3>Import Preview</h3>
          </div>

          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Monthly Salary</th>
                  <th>Wage Type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {previewData.map((employee, index) => (
                  <tr key={`${employee.employeeCode}-${index}`}>
                    <td>{employee.employeeCode}</td>
                    <td>{employee.name}</td>
                    <td>{employee.department}</td>
                    <td>{employee.designation}</td>
                    <td>{employee.joiningDate}</td>
                    <td>₹{Number(employee.monthlySalary || 0).toLocaleString()}</td>
                    <td>{employee.wageType}</td>
                    <td>
                      <span className={`status-badge ${employee.status === "Valid" ? "status-active" : "status-inactive"}`}>
                        {employee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="employee-card import-errors">
          <div className="card-header">
            <h3>Validation Errors</h3>
          </div>

          <div className="import-error-list">
            {errors.map((error, index) => (
              <div key={`${error.row}-${index}`} className="import-error-item">
                <span className="material-symbols-outlined">error</span>
                <strong>Row {error.row}</strong>
                — {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="import-footer">
          <button className="btn btn-primary" disabled={summary.invalid > 0} onClick={handleImport}>
            Import {summary.valid} Employees
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeImport;
