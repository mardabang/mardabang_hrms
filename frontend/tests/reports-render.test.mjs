import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";

test("Reports renders before employees load without an initialization error", async () => {
  const bundle = await build({
    stdin: {
      contents: `
        import React from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { AuthProvider } from "./src/context/AuthContext";
        import { FirmProvider } from "./src/context/FirmContext";
        import Reports from "./src/pages/Reports";
        export const render = () => renderToStaticMarkup(
          <AuthProvider><FirmProvider><Reports /></FirmProvider></AuthProvider>
        );
      `,
      resolveDir: path.resolve("."),
      loader: "jsx",
    },
    bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".css": "empty" },
  });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(
    createRequire(import.meta.url), compiled, compiled.exports
  );
  globalThis.localStorage = { getItem: () => null };
  try {
    const html = compiled.exports.render();
    for (const title of ["Monthly Presenty", "Firm Salary Summary", "Ledger Report", "Employee Directory Export", "Employee Yearly Report"]) {
      assert.ok(html.includes(title), `Missing report: ${title}`);
    }
  } finally {
    delete globalThis.localStorage;
  }
});
