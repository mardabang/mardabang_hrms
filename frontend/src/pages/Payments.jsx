import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import PaymentDetailsModal from "../components/PaymentDetailsModal";
import PaymentFilter from "../components/PaymentFilter";
import PaymentTable from "../components/PaymentTable";
import RecordPaymentModal from "../components/RecordPaymentModal";

import { addActivity } from "../data/activityLog";
import api from "../api";

const formatMonth = (dateValue) => {
  if (!dateValue) return "-";

  const [year, month] =
    dateValue.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
};

const formatPaymentMode = (mode) => {
  if (!mode) return "-";

  if (mode === "BANK_TRANSFER") {
    return "Bank Transfer";
  }

  if (mode === "CASH") {
    return "Cash";
  }

  return mode;
};

const formatStatus = (status) => {
  if (!status) return "Pending";

  if (status === "PAID") {
    return "Paid";
  }

  if (status === "FINALIZED") {
    return "Finalized";
  }

  return "Pending";
};

const Payments = () => {
  const [salaryRecords, setSalaryRecords] =
    useState([]);

  const [employees, setEmployees] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filters, setFilters] =
    useState({
      search: "",
      month: "All",
      department: "All",
      status: "All",
    });

  const [recordingPayment, setRecordingPayment] =
    useState(null);

  const [detailsPayment, setDetailsPayment] =
    useState(null);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        salaryResponse,
        employeeResponse,
      ] = await Promise.all([
        api.get("/payroll/payments"),
        api.get("/employees"),
      ]);

      setSalaryRecords(
        Array.isArray(salaryResponse.data)
          ? salaryResponse.data
          : []
      );

      setEmployees(
        Array.isArray(employeeResponse.data)
          ? employeeResponse.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load payment data:",
        err
      );

      setError(
        err.response?.data?.message ||
        "Failed to load payment records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      map.set(
        Number(employee.id),
        employee
      );
    });

    return map;
  }, [employees]);

  const payments = useMemo(() => {
    return salaryRecords.map((record) => {
      const employee =
        employeeMap.get(
          Number(record.employeeId)
        );

      return {
        salaryRecordId: record.id,

        employeeId:
          employee?.employeeCode ||
          `EMP-${record.employeeId}`,

        employeeName:
          employee?.name ||
          "Unknown Employee",

        department:
          employee?.department ||
          "-",

        month:
          formatMonth(record.salaryMonth),

        grossSalary:
          Number(
            record.monthlySalary || 0
          ),

        overtime:
          Number(
            record.overtimeAmount || 0
          ),

        deductions:
          Number(
            record.deductions || 0
          ),

        netSalary:
          Number(
            record.netSalary || 0
          ),

        bonus: 
          Number(
            record.bonus || 0
          ),

        paymentMode:
          formatPaymentMode(
            record.paymentMode
          ),

        paymentDate:
          record.paymentDate || "",

        status:
          formatStatus(
            record.paymentStatus
          ),

        referenceNumber:
          record.transactionReference ||
          "",

        recordedBy: "-",

        recordedAt: "-",
      };
    });
  }, [salaryRecords, employeeMap]);

  const months = useMemo(() => {
    return [
      ...new Set(
        payments
          .map((payment) => payment.month)
          .filter(
            (month) => month !== "-"
          )
      ),
    ];
  }, [payments]);

  const departments = useMemo(() => {
    return [
      ...new Set(
        payments
          .map(
            (payment) =>
              payment.department
          )
          .filter(
            (department) =>
              department &&
              department !== "-"
          )
      ),
    ].sort();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const search =
      filters.search
        .toLowerCase()
        .trim();

    return payments.filter(
      (payment) => {

        const matchesSearch =
          !search ||
          payment.employeeName
            .toLowerCase()
            .includes(search) ||
          payment.employeeId
            .toLowerCase()
            .includes(search);

        const matchesMonth =
          filters.month === "All" ||
          payment.month ===
            filters.month;

        const matchesDepartment =
          filters.department === "All" ||
          payment.department ===
            filters.department;

        const matchesStatus =
          filters.status === "All" ||
          payment.status ===
            filters.status;

        return (
          matchesSearch &&
          matchesMonth &&
          matchesDepartment &&
          matchesStatus
        );
      }
    );
  }, [payments, filters]);

  const totalPayroll = useMemo(() => {
    return payments.reduce(
      (total, payment) =>
        total + payment.netSalary,
      0
    );
  }, [payments]);

  const paidAmount = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          payment.status === "Paid"
      )
      .reduce(
        (total, payment) =>
          total + payment.netSalary,
        0
      );
  }, [payments]);

  const pendingAmount = useMemo(() => {
  return payments
    .filter((payment) => payment.status !== "Paid")   // everything not yet paid
    .reduce((total, payment) => total + payment.netSalary, 0);
}, [payments]);

  const employeeCount = useMemo(() => {
    return new Set(
      payments.map(
        (payment) =>
          payment.employeeId
      )
    ).size;
  }, [payments]);

  const updateFilter = (
    field,
    value
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      month: "All",
      department: "All",
      status: "All",
    });
  };

  const handlePaymentAction = (
    payment
  ) => {
    if (
      payment.status ===
      "Finalized"
    ) {
      setRecordingPayment(payment);
      return;
    }

    setDetailsPayment(payment);
  };

  const savePayment = async (
    paymentData
  ) => {
    try {
      setError("");

      await api.put(
        `/payroll/${paymentData.salaryRecordId}/pay`,
        {
          paymentMode:
            paymentData.paymentMode,

          paymentDate:
            paymentData.paymentDate,

          transactionReference:
            paymentData.transactionReference,
        }
      );

      const employee =
        recordingPayment?.employeeName ||
        "Employee";

      const employeeId =
        recordingPayment?.employeeId ||
        "";

      addActivity({
        icon: "payments",
        title: "Payment recorded",
        description:
          `${employee} (${employeeId}) payment marked Paid.`,
        path: "/payments",
      });

      setRecordingPayment(null);

      await loadPaymentData();

    } catch (err) {
      console.error(
        "Failed to record payment:",
        err
      );

      setError(
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to record payment."
      );
    }
  };

  return (
    <div className="payments-page">

      <div className="page-header">

        <div>
          <h1>Payments</h1>

          <p>
            Manage employee salary payments
            and payment records.
          </p>
        </div>

      </div>

      {error && (
        <div
          className="payment-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="stats-grid payment-stats">

        <div className="dashboard-card payment-summary-card">
          <span className="material-symbols-outlined">
            account_balance_wallet
          </span>

          <div>
            <h2>
              ₹{totalPayroll.toLocaleString("en-IN")}
            </h2>

            <p>Total Payroll</p>
          </div>
        </div>

        <div className="dashboard-card payment-summary-card">
          <span className="material-symbols-outlined">
            task_alt
          </span>

          <div>
            <h2>
              ₹{paidAmount.toLocaleString("en-IN")}
            </h2>

            <p>Paid</p>
          </div>
        </div>

        <div className="dashboard-card payment-summary-card">
          <span className="material-symbols-outlined">
            pending
          </span>

          <div>
            <h2>
              ₹{pendingAmount.toLocaleString("en-IN")}
            </h2>

            <p>Pending</p>
          </div>
        </div>

        <div className="dashboard-card payment-summary-card">
          <span className="material-symbols-outlined">
            groups
          </span>

          <div>
            <h2>
              {employeeCount}
            </h2>

            <p>Employees</p>
          </div>
        </div>

      </div>

      <div className="dashboard-card payment-table-card">

        <PaymentFilter
          filters={filters}
          onChange={updateFilter}
          onReset={resetFilters}
          months={months}
          departments={departments}
        />

        {loading ? (
          <div className="payment-empty-state">
            Loading payment records...
          </div>
        ) : (
          <PaymentTable
            payments={filteredPayments}
            onAction={
              handlePaymentAction
            }
          />
        )}

      </div>

      <RecordPaymentModal
        payment={recordingPayment}
        onClose={() =>
          setRecordingPayment(null)
        }
        onSave={savePayment}
      />

      <PaymentDetailsModal
        payment={detailsPayment}
        onClose={() =>
          setDetailsPayment(null)
        }
      />

    </div>
  );
};

export default Payments;