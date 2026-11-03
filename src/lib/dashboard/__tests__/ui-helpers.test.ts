import assert from "node:assert/strict";
import { test } from "node:test";
import { chartScale, compactInr, formatIstDate, greeting, relativeTime } from "../ui-helpers";

test("compact INR uses Indian lakh and crore units and preserves negative values", () => {
  assert.equal(compactInr(12_300), "₹12,300");
  assert.equal(compactInr(1_230_000), "₹12.3L");
  assert.equal(compactInr(12_000_000), "₹1.2Cr");
  assert.equal(compactInr(-1_250_000), "−₹12.5L");
});

test("relative time handles recent, past, future, and invalid timestamps", () => {
  const now = new Date("2026-11-03T10:00:00+05:30");
  assert.equal(relativeTime("2026-11-03T09:59:30+05:30", now), "just now");
  assert.equal(relativeTime("2026-11-03T08:00:00+05:30", now), "2h ago");
  assert.equal(relativeTime("2026-11-01T10:00:00+05:30", now), "2d ago");
  assert.equal(relativeTime("2026-11-03T11:00:00+05:30", now), "in 1h");
  assert.equal(relativeTime("not a date", now), "Time unavailable");
});

test("chart scale handles proportional values, zero-only input, and invalid height", () => {
  const scale = chartScale([0, 25, 50], 100);
  assert.equal(scale.max, 50);
  assert.equal(scale.position(25), 50);
  assert.equal(scale.position(100), 100);
  assert.equal(scale.position(-3), 0);
  assert.equal(chartScale([0, Number.NaN], 90).position(0), 0);
  assert.equal(chartScale([20], Number.NaN).position(20), 0);
});

test("dashboard dates are formatted in IST", () => {
  assert.equal(formatIstDate("2026-11-02T18:45:00.000Z"), "03 Nov 2026");
  assert.equal(greeting(new Date("2026-11-03T02:00:00.000Z")), "Good morning");
  assert.equal(greeting(new Date("2026-11-02T18:30:00.000Z")), "Good morning");
});
