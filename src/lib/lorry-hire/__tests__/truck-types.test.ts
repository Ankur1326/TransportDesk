import { test } from "node:test";
import assert from "node:assert/strict";
import { TRUCK_TYPE_CATALOG, findTruckType, truckTypeChoices } from "../truck-types";

test("catalog has 17 unique types", () => {
  assert.equal(TRUCK_TYPE_CATALOG.length, 17);
  assert.equal(new Set(TRUCK_TYPE_CATALOG.map((t) => t.key)).size, 17);
  assert.equal(new Set(TRUCK_TYPE_CATALOG.map((t) => t.label)).size, 17);
});

test("every label fits the 60-character limit on the contract", () => {
  for (const t of TRUCK_TYPE_CATALOG) assert.ok(t.label.length <= 60, t.label);
});

test("finds a type by its label, ignoring case and spacing", () => {
  assert.equal(findTruckType("  tanker ")?.key, "tanker");
  assert.equal(findTruckType("Vehicle  Carrier Truck")?.key, "vehicle-carrier");
});

test("values saved by the older form still resolve", () => {
  assert.equal(findTruckType("Pickup")?.key, "pickup");
  assert.equal(findTruckType("Open Truck")?.key, "half-body");
  assert.equal(findTruckType("Closed Container")?.key, "container");
  assert.equal(findTruckType("Trailer")?.key, "full-trailer");
  assert.equal(findTruckType("Tipper")?.key, "tipper");
});

test("unknown or blank values have no type", () => {
  assert.equal(findTruckType("Other"), null);
  assert.equal(findTruckType(""), null);
  assert.equal(findTruckType(undefined), null);
});

test("a saved value outside the catalog is kept as an extra choice", () => {
  assert.equal(truckTypeChoices("Tanker").length, 17);
  const extra = truckTypeChoices("Open Truck");
  assert.equal(extra.length, 18);
  assert.deepEqual(extra[17], { value: "Open Truck", key: "half-body" });
  assert.deepEqual(truckTypeChoices("Other")[17], { value: "Other", key: null });
});
