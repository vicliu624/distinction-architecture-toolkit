import test from "node:test";
import assert from "node:assert/strict";

test("core model exports are importable", async () => {
  const module = await import("./index.js");
  assert.ok(module);
});
