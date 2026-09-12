import React from "react";

const statusClass = {
  Paid: "payment-status-paid",
  Pending: "payment-status-pending",
  Finalized: "payment-status-pending",
};

const PaymentTable = ({
  payments,
  onAction,
}) => {
  return (
    <div className="payment-table-wrapper">
      <table className="payment-table">

        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Employee</th>
            <th>Department</th>
            <th>Gross Salary</th>
            <th>Deductions</th>
            <th>Net Salary</th>
            <th>Payment Mode</th>
            <th>Payment Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {payments.length ? (
            payments.map((payment) => (

              <tr key={payment.salaryRecordId}>

                <td>{payment.employeeId}</td>

                <td className="payment-employee-name">
                  {payment.employeeName}
                </td>

                <td>{payment.department}</td>

                <td>
                  ₹{Number(
                    payment.grossSalary || 0
                  ).toLocaleString("en-IN")}
                </td>

                <td>
                  ₹{Number(
                    payment.deductions || 0
                  ).toLocaleString("en-IN")}
                </td>

                <td>
                  ₹{Number(
                    payment.netSalary || 0
                  ).toLocaleString("en-IN")}
                </td>

                <td>
                  {payment.paymentMode}
                </td>

                <td>
                  {payment.paymentDate || "-"}
                </td>

                <td>
                  <span
                    className={`payment-status ${
                      statusClass[payment.status] || ""
                    }`}
                  >
                    {payment.status}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="payment-action-button"
                    onClick={() =>
                      onAction(payment)
                    }
                  >
                    {payment.status === "Finalized"
                      ? "Pay"
                      : "View"}
                  </button>
                </td>

              </tr>

            ))
          ) : (

            <tr>
              <td
                className="payment-empty-state"
                colSpan="10"
              >
                No payment records found.
              </td>
            </tr>

          )}

        </tbody>

      </table>
    </div>
  );
};

export default PaymentTable;