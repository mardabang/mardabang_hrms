import test from "node:test";
import assert from "node:assert/strict";
import { registrationPayload, validateRegistration } from "../src/utils/userAccess.js";

const supervisor = { fullName: "Test Supervisor", email: "supervisor@example.test", mobile: "9876543210", employeeCode: "EMP-TEST", role: "INPUTER", password: "", confirmPassword: "" };
test("supervisor registration requires no password and never sends one", () => {
  assert.equal(validateRegistration(supervisor), "");
  const payload = registrationPayload({ ...supervisor, password: "previous-admin-password" });
  assert.equal(Object.hasOwn(payload, "password"), false);
  assert.equal(payload.mobile, supervisor.mobile);
  assert.equal(payload.employeeCode, supervisor.employeeCode);
  assert.equal(payload.role, "INPUTER");
});
test("admin registration retains password validation and omits employee linkage", () => {
  const admin = { ...supervisor, role: "ADMIN", password: "long-password-123", confirmPassword: "long-password-123" };
  assert.equal(validateRegistration(admin), "");
  assert.equal(registrationPayload(admin).password, admin.password);
  assert.equal(registrationPayload(admin).employeeCode, null);
  assert.match(validateRegistration({ ...admin, confirmPassword: "different" }), /match/);
  assert.match(validateRegistration({ ...admin, password: "short" }), /12/);
});
test("mobile validation matches the OTP login format", () => {
  for (const mobile of ["", "12345", "+919876543210", "1234567890", "987654321x"]) {
    assert.match(validateRegistration({ ...supervisor, mobile }), /10-digit/);
  }
  assert.match(validateRegistration({ ...supervisor, employeeCode: " " }), /employee code/);
});
