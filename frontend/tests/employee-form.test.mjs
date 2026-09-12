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
      import { MemoryRouter } from "react-router-dom";
      import { AuthProvider } from "./src/context/AuthContext";
      import { FirmProvider } from "./src/context/FirmContext";
      import AddEmployee from "./src/pages/AddEmployee";
      export { toEmployeePayload } from "./src/data/employees";
      export const render = () => renderToStaticMarkup(
        <MemoryRouter><AuthProvider><FirmProvider><AddEmployee /></FirmProvider></AuthProvider></MemoryRouter>
      );
    `,
    resolveDir: path.resolve("."), loader: "jsx",
  },
  bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
});
const compiled = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { toEmployeePayload, render } = compiled.exports;
const details = {
  firstName: "First", lastName: "Last", gender: "Female", dateOfBirth: "2000-01-01",
  employmentType: "Contract", address: "Entered address", pfAccountNumber: "PF-123", esiAccountNumber: "ESI-123", firmId: 1,
};

test("all added employee details are sent under the backend field names", () => {
  const payload = toEmployeePayload(details);
  for (const [field, value] of Object.entries(details)) assert.equal(payload[field], value, field);
});
test("partial updates preserve existing personal details and the allocated firm", () => {
  const payload = toEmployeePayload({ designation: "Updated" }, details);
  for (const [field, value] of Object.entries(details)) assert.equal(payload[field], value, field);
});
test("photo storage metadata is never submitted as employee input", () => {
  const payload = toEmployeePayload({ profilePhotoKey: "not-client-editable", profilePhotoName: "photo.jpg", hasProfilePhoto: true });
  for (const field of ["profilePhotoKey", "profilePhotoName", "hasProfilePhoto"]) assert.equal(Object.hasOwn(payload, field), false);
});
test("admin Add Employee renders every missing input and a photo upload", () => {
  globalThis.localStorage = { getItem: key => key === "hrms_user" ? JSON.stringify({ role: "ADMIN", id: "test" }) : null };
  try {
    const html = render();
    for (const field of Object.keys(details).filter(field => field !== "firmId")) assert.ok(html.includes(`name="${field}"`), field);
    assert.ok(html.includes('name="profilePhoto"'));
    assert.ok(html.includes('type="file"'));
  } finally { delete globalThis.localStorage; }
});
