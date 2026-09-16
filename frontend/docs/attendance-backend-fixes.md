# Attendance backend fixes

The UI and frontend files are unchanged.

- The missing-checkout job uses shift end, checks older open records, and conditionally updates only eligible records that still have no checkout. It does not invent checkout times or overwrite completed attendance.
- Shift start/end and overtime eligibility use the same enum definitions returned by `/api/attendance/shifts`. Existing legacy Morning/Evening names retain their fallback times. Attendance uses `app.attendance.time-zone`, default `Asia/Kolkata`.
- Supervisor reads require an assigned company. Writes check the authenticated account, employee/company match, company assignment and active status. Employees can punch only their own records and cannot use manual attendance. Historical manual corrections remain available to admins/supervisors for their permitted companies.
- Employee name, department, shift and actor are derived on the backend. Existing manual records keep their original name/department/shift snapshot. Request formats remain compatible with the UI.
- All punch/manual transactions lock the employee row before looking up attendance. Existing attendance lookups also lock the record. A startup migration installs the unique index `uk_attendance_employee_day` over company, employee and attendance date. Concurrent conflicts return HTTP 409; forbidden access returns HTTP 403.
- Paid-day calculations include paid leave and holidays. A missing checkout with a real check-in preserves the paid day, matching the existing treatment of an open PRESENT/LATE record; it generates no overtime. Weekly-off entries obey the company's paid-weekly-off setting. Previously generated salary records must be regenerated through the existing flow to use the updated calculation.

Restart the backend in Eclipse after refreshing the project. The migration needs permission to create a database index. If legacy duplicate company/employee/day records exist, startup stops with a specific diagnostic and leaves all records intact; resolve duplicates before retrying. Null-company legacy records are left intact; new punches require a valid company.

Live MySQL migration and concurrent requests require verification after restart. Unit tests do not prove the live schema has the index.

Later improvements remain: full timestamp-based overnight checkout, persistent correction audit history, configurable grace periods, a dedicated assigned-shift model, and frontend status consistency.
