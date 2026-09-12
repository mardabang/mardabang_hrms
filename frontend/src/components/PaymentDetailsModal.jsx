import React from "react";

const PaymentDetailsModal = ({ payment, onClose }) => {
  if (!payment) return null;

  const details = [
    ["Employee Name", payment.employeeName],
    ["Employee ID", payment.employeeId],
    ["Salary Month", payment.month],
    [
      "Gross Salary",
      `₹${Number(payment.grossSalary || 0).toLocaleString("en-IN")}`,
    ],
    [
      "Overtime",
      `₹${Number(payment.overtime || 0).toLocaleString("en-IN")}`,
    ],
    [
      "Deductions",
      `₹${Number(payment.deductions || 0).toLocaleString("en-IN")}`,
    ],
    [
      "Net Salary",
      `₹${Number(payment.netSalary || 0).toLocaleString("en-IN")}`,
    ],

    [
  "Overtime",
  `₹${Number(payment.overtime || 0).toLocaleString("en-IN")}`,
],
[
  "Bonus",
  `₹${Number(payment.bonus || 0).toLocaleString("en-IN")}`,
],
    ["Payment Mode", payment.paymentMode || "-"],
    ["Payment Date", payment.paymentDate || "-"],
    ["Reference Number", payment.referenceNumber || "-"],
    ["Status", payment.status],
  ];

  return (
    <div
      className="payment-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="payment-modal payment-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-details-title"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="payment-modal-header">
          <div>
            <h2 id="payment-details-title">
              Payment Details
            </h2>

            <p>
              {payment.employeeName} ·{" "}
              {payment.employeeId}
            </p>
          </div>

          <button
            type="button"
            className="payment-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <div className="payment-details-grid">
          {details.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="payment-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;