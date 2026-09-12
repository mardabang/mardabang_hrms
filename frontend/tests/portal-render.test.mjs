import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { AuthProvider } from "./src/context/AuthContext";
      import { FirmProvider } from "./src/context/FirmContext";
      import { MyProfile } from "./src/pages/EmployeePortal";
      import LeaveManagement from "./src/pages/LeaveManagement";
      export const render = (page, portal) => renderToStaticMarkup(
        <AuthProvider><FirmProvider>{page === "profile" ? <MyProfile /> : <LeaveManagement portal={portal} />}</FirmProvider></AuthProvider>
      );
    `,
    resolveDir: path.resolve("."),
    loader: "jsx",
  },
  bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".css": "empty" },
});
const compiled = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const render = compiled.exports.render;
const setUser = user => {
  globalThis.localStorage = { getItem: key => key === "hrms_user" ? JSON.stringify(user) : null };
};

test("employee profile render never shows the admin account's personal information", () => {
  setUser({ role: "ADMIN", fullName: "Private Admin Name", email: "admin@example.test", firms: ["MSI"] });
  const html = render("profile");
  assert.doesNotMatch(html, /Private Admin Name|admin@example\.test|MSI/);
  assert.match(html, /Employee preview/);
});
test("employee profile waits for backend details instead of rendering account placeholders", () => {
  setUser({ role: "EMPLOYEE", fullName: "Test Employee", employeeCode: "TEST-1", firms: ["MBIPL"] });
  const html = render("profile");
  assert.match(html, /Loading your profile/);
  assert.doesNotMatch(html, /Test Employee/);
  assert.doesNotMatch(html, /Administrator|Assigned firms/);
});
test("leave portals have no local drafts or simulated submitted requests", () => {
  for (const portal of ["admin", "supervisor", "employee"]) {
    setUser({ role: portal.toUpperCase(), id: "test-user", firms: ["MBIPL"] });
    const html = render("leave", portal);
    assert.match(html, /My Leave Requests|Employee Leave Requests/);
    assert.doesNotMatch(html, /Saved Drafts|Save Draft|Review &amp; Submit/);
    assert.doesNotMatch(html, /Leave submitted|Request approved/);
    if (portal !== "admin") assert.match(html, /Apply for Leave/);
  }
});
