import React from "react";

const PaymentFilter = ({
  filters,
  onChange,
  onReset,
  months,
  departments,
}) => {
  return (
    <div className="payment-filter">

      <div className="payment-search">
        <span className="material-symbols-outlined">
          search
        </span>

        <input
          type="search"
          placeholder="Search employee..."
          value={filters.search}
          onChange={(event) =>
            onChange(
              "search",
              event.target.value
            )
          }
        />
      </div>

      <select
        value={filters.month}
        onChange={(event) =>
          onChange(
            "month",
            event.target.value
          )
        }
      >
        <option value="All">
          All Months
        </option>

        {months.map((month) => (
          <option
            key={month}
            value={month}
          >
            {month}
          </option>
        ))}
      </select>

      <select
        value={filters.department}
        onChange={(event) =>
          onChange(
            "department",
            event.target.value
          )
        }
      >
        <option value="All">
          All Departments
        </option>

        {departments.map((department) => (
          <option
            key={department}
            value={department}
          >
            {department}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) =>
          onChange(
            "status",
            event.target.value
          )
        }
      >
        <option value="All">
          All Statuses
        </option>

        <option value="Pending">
          Pending
        </option>

        <option value="Finalized">
          Finalized
        </option>

        <option value="Paid">
          Paid
        </option>
      </select>

      <button
        type="button"
        className="payment-reset-button"
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

export default PaymentFilter;