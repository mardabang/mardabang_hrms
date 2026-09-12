# Leave management

All new requests and decisions are stored in `employee_leave_requests`. The existing Hibernate `ddl-auto=update` setting creates the new table on application startup. No sample data is inserted.

The pre-existing `leave_requests` table is preserved. Its single historical record has no matching employee or firm and cannot safely be assigned to an owner automatically. It has not been imported into the new workflow; admin must identify its employee and firm before migration. No historical request has been deleted.

Endpoints (authenticated):
- `GET /api/leaves?mine=true` returns only the signed-in user's requests.
- `GET /api/leaves?firmCode=MBIPL` returns a firm's requests for admin, or assigned employees for supervisor.
- `POST /api/leaves` accepts `type`, `from`, `to`, `reason`, and (for supervisor) `firmCode`. Ownership and the employee's firm are resolved by the server.
- `PUT /api/leaves/{id}/review` accepts `status` (`Approved`/`Rejected`) and `note`.
- `PUT /api/leaves/{id}/cancel` permits only the owner of a pending request.
- `GET /api/leaves/policy` and `GET /api/leaves/days?from=YYYY-MM-DD&to=YYYY-MM-DD` provide the policy and server-calculated duration.

Configuration in application properties or equivalent environment variables:

```properties
app.leave.supervisor-max-days=2
app.leave.weekly-off-days=SUNDAY
app.leave.holidays=
app.leave.time-zone=Asia/Kolkata
```

Holiday values are comma-separated ISO dates. There are no default holiday dates. Weekly offs can contain multiple comma-separated day names. These settings currently apply across firms. Changing them requires a backend restart; existing requests retain their submitted working-day count.

The current supervisor assignment is `Employee.createdByUserId`, matching `/api/supervisor/employees`. Employees created by admin or without an assigned creator remain reviewable by admin. The legacy backend supervisor role is `INPUTER`.

Admin can see and decide pending requests. Supervisors can decide only their assigned employees' requests of up to the configured limit. Supervisors' own leave always requires admin. Self-review, cross-firm access, repeat decisions and overlapping pending/approved requests are rejected. Pessimistic locks serialize submissions per owner and decisions per request. Reviewer identity, role, timestamp and remarks are retained.

This implements leave requests and approval. Leave allowances, accrual, and automatic changes to attendance or payroll are not configured by this module. No salary is changed by an approval. Those require the firm's paid/unpaid leave and attendance-conflict policies before integration.

Verification: `mvn -Dtest=LeaveServiceTest test` exercises approval boundaries, visibility, cancellation, submission, overlapping requests and working-day calculation without connecting to the production database.
