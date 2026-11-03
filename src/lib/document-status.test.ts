import { test } from "node:test";
import assert from "node:assert/strict";
import { getDocumentStatus } from "./document-status";

test("document status distinguishes missing and expired dates", () => {
  assert.equal(getDocumentStatus(undefined, "2026-01-01"), "Missing");
  assert.equal(getDocumentStatus("2025-12-31", "2026-01-01"), "Expired");
  assert.equal(getDocumentStatus("not-a-date", "2026-01-01"), "Missing");
});

test("document status uses the warning window inclusively and compares calendar days", () => {
  assert.equal(getDocumentStatus("2026-01-31", "2026-01-01"), "Expiring");
  assert.equal(getDocumentStatus("2026-02-01", "2026-01-01"), "Valid");
  assert.equal(getDocumentStatus("2026-01-01T22:00:00Z", "2026-01-01T02:00:00Z"), "Expiring");
  assert.equal(getDocumentStatus("2026-01-02", "2026-01-01", 0), "Valid");
});
