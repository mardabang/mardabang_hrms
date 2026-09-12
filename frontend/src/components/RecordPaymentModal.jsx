import React, { useEffect, useState } from "react";

const RecordPaymentModal = ({ payment, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    paymentMode: "BANK_TRANSFER",
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        paymentMode:
          payment.paymentMode === "CASH"
            ? "CASH"
            : "BANK_TRANSFER",
        paymentDate:
          new Date().toISOString().slice(0, 10),
        referenceNumber: "",
        notes: "",
      });
    }
  }, [payment]);

  if (!payment) return null;

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div
      className="payment-modal-backdrop"
      onClick={onClose}
    >
      <form
        className="payment-modal"
        onSubmit={(event) => {
          event.preventDefault();

          onSave({
            salaryRecordId: payment.salaryRecordId,
            paymentMode: formData.paymentMode,
            paymentDate: formData.paymentDate,
            transactionReference:
              formData.referenceNumber,
          });
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="payment-modal-header">
          <div>
            <h2>Record Payment</h2>
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

        <div className="payment-modal-body">

          <div className="payment-modal-summary">
            <span>Employee</span>
            <strong>{payment.employeeName}</strong>

            <span>Salary Month</span>
            <strong>{payment.month}</strong>

            <span>Net Salary</span>
            <strong>
              ₹{Number(payment.netSalary || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <label>
            Payment Mode

            <select
              value={formData.paymentMode}
              onChange={(event) =>
                updateField(
                  "paymentMode",
                  event.target.value
                )
              }
            >
              <option value="BANK_TRANSFER">
                Bank Transfer
              </option>

              <option value="CASH">
                Cash
              </option>
            </select>
          </label>

          <label>
            Payment Date

            <input
              type="date"
              required
              value={formData.paymentDate}
              onChange={(event) =>
                updateField(
                  "paymentDate",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Transaction / Reference Number

            <input
              value={formData.referenceNumber}
              onChange={(event) =>
                updateField(
                  "referenceNumber",
                  event.target.value
                )
              }
              placeholder="Enter reference number"
            />
          </label>

          <label>
            Payment Notes

            <textarea
              value={formData.notes}
              onChange={(event) =>
                updateField(
                  "notes",
                  event.target.value
                )
              }
              placeholder="Add notes"
              rows="3"
            />
          </label>

        </div>

        <div className="payment-modal-actions">

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
          >
            Record Payment
          </button>

        </div>
      </form>
    </div>
  );
};

export default RecordPaymentModal;