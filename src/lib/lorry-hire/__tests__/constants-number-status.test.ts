import { test } from "node:test";
import assert from "node:assert/strict";

import { formatVehicleNumber, isValidVehicleNumber, normalizeVehicleNumber } from "../constants";
import { formatLhcNo, nextLhcSequence, parseLhcNo } from "../number";
import { canCancelLorryHire, canTransitionLorryHire } from "../status";

test("vehicle numbers: normalise, validate, format", () => {
  assert.equal(normalizeVehicleNumber("mh-23 au 6718"), "MH23AU6718");
  for (const ok of ["MH23AU6718", "GJ6AB1234", "DL1CAB1234", "RJ14GA0001", "22BH1234AA", "mh 23 au 6718"]) {
    assert.equal(isValidVehicleNumber(ok), true, ok);
  }
  for (const bad of ["", "ABC", "1234", "MH23AU67", "MH23AU67189"]) {
    assert.equal(isValidVehicleNumber(bad), false, bad);
  }
  assert.equal(formatVehicleNumber("MH23AU6718"), "MH-23-AU-6718");
});

test("LHC numbers: parse and format", () => {
  assert.equal(parseLhcNo("LHC/1624"), 1624);
  assert.equal(parseLhcNo(" lhc/7 "), 7);
  assert.equal(parseLhcNo("1624"), null);
  assert.equal(parseLhcNo("LHC/12A"), null);
  assert.equal(parseLhcNo("LHC/"), null);
  assert.equal(formatLhcNo(1625), "LHC/1625");
});

test("LHC numbers: next sequence respects the configured start", () => {
  assert.equal(nextLhcSequence(null), 1);
  assert.equal(nextLhcSequence(undefined, 1624), 1624);
  assert.equal(nextLhcSequence(1624, 1), 1625);
  assert.equal(nextLhcSequence(10, 1624), 1624); // start number is a floor
  assert.equal(nextLhcSequence(5, 0), 6); // invalid start falls back to 1
});

test("status transitions", () => {
  assert.equal(canTransitionLorryHire("Hired", "In Transit"), true);
  assert.equal(canTransitionLorryHire("Delivered", "In Transit"), true);
  assert.equal(canTransitionLorryHire("Delivered", "Cancelled"), false);
  assert.equal(canTransitionLorryHire("Cancelled", "Hired"), false);
  assert.equal(canTransitionLorryHire("Hired", "Hired"), true);
});

test("cancelling is blocked once money has been paid", () => {
  assert.equal(canCancelLorryHire("Hired", 0).ok, true);
  assert.equal(canCancelLorryHire("Hired", 500).ok, false);
  assert.equal(canCancelLorryHire("Delivered", 0).ok, false);
});
