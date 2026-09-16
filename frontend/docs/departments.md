# Departments

Restart the backend, then refresh the frontend. In Eclipse, stop the application and run it again so the updated Java classes load.

The existing Hibernate `ddl-auto=update` setting creates the `departments` table and the `employees.department_id` foreign key. The startup migration seeds textile departments for companies that do not have departments yet and links existing employee department names. Legacy names remain available on existing records but are inactive for new assignments. Restarting does not recreate renamed defaults or reactivate departments.

Log in as an admin, select a company in the top bar, and open **Settings → Administration → Departments** (`/settings/departments`). Add, rename, deactivate or reactivate its departments. Names are unique within each company, ignoring case and repeated spaces. Deactivation preserves employee references and attendance history.

The Add Employee form fetches active departments for the selected company. Supervisors can read departments only for their assigned companies. An existing inactive department can remain selected while editing its employee. Spreadsheet imports resolve department names against this table; add the department first if it is missing.

Team has been removed from attendance forms, requests, entities and queries. The old database `attendance_records.team` column remains as an unmapped nullable column to preserve historical values and allow new attendance inserts.

Live MySQL migration and browser interaction require verification after restart; the build and unit tests do not connect to the office database.
