import test from "node:test";
import assert from "node:assert/strict";
import { getEmployeeUser, getEmployeeFirm, belongsToFirm, leaveDays, validateLeave } from "../src/utils/employeePortal.js";

test("admin preview never becomes an employee identity or firm", () => {
  const admin = { role: "ADMIN", fullName: "Admin", firms: ["MBIPL"] };
  assert.equal(getEmployeeUser(admin), null);
  assert.equal(getEmployeeFirm(admin), null);
});
test("employee uses only the single firm assigned to their account", () => {
  assert.deepEqual(getEmployeeFirm({ role: "EMPLOYEE", firms: ["MBIPL"] }), { code: "MBIPL", name: "" });
  assert.equal(getEmployeeFirm({ role: "EMPLOYEE", firms: [] }), null);
  assert.equal(getEmployeeFirm({ role: "EMPLOYEE", firms: ["MBIPL", "MSI"] }), null);
});
test("firm filtering excludes unrelated or unidentified records", () => {
  const firm = { id: 1, code: "MBIPL" };
  assert.equal(belongsToFirm({ firmId: "1" }, firm), true);
  assert.equal(belongsToFirm({ firmCode: "MSI", firmId: 1 }, firm), false);
  assert.equal(belongsToFirm({ firmId: 2 }, firm), false);
  assert.equal(belongsToFirm({}, firm), false);
});
test("leave duration includes both dates and rejects impossible dates", () => {
  assert.equal(leaveDays("2026-09-08", "2026-09-08"), 1);
  assert.equal(leaveDays("2026-09-08", "2026-09-10"), 3);
  assert.equal(leaveDays("2026-09-10", "2026-09-08"), 0);
  assert.equal(leaveDays("2026-02-30", "2026-03-03"), 0);
});
test("leave validation requires future dates and a reason", () => {
  const request = { from: "2026-09-08", to: "2026-09-10", reason: "Family event" };
  assert.equal(validateLeave(request, "2026-09-08"), "");
  assert.match(validateLeave({ ...request, from: "2026-09-07" }, "2026-09-08"), /today or a future/);
  assert.match(validateLeave({ ...request, reason: "   " }, "2026-09-08"), /reason/);
});
