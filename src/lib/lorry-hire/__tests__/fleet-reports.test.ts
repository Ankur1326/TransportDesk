import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateDrivers, aggregateVehicles, buildTripProfit, type ReportContract } from "../fleet-reports";

const base = (o: Partial<ReportContract>): ReportContract => ({
  _id: "x", lhcNo: "LHC/1", lhcDate: "2026-10-01", status: "Hired", supplierName: "S1",
  fromLocation: "Jaipur", toLocation: "Pune", vehicleNumber: "MH-23-AU-6718",
  grossHire: 10000, items: [], ...o,
});

test("profit: revenue from linked LRs, cancelled LR/contract ignored, unlinked flagged", () => {
  const lr = new Map([["a", { freight: 8000, status: "Booked" }], ["b", { freight: 6000, status: "Delivered" }], ["c", { freight: 999, status: "Cancelled" }]]);
  const { rows, totals } = buildTripProfit(
    [
      base({ _id: "1", items: [{ consignmentId: "a", cnNo: "1" }, { consignmentId: "b", cnNo: "2" }, { cnNo: "manual" }, { consignmentId: "c", cnNo: "3" }] }),
      base({ _id: "2", status: "Cancelled", items: [{ consignmentId: "a", cnNo: "1" }] }),
    ],
    lr
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].revenue, 14000);
  assert.equal(rows[0].profit, 4000);
  assert.equal(rows[0].marginPct, 28.57);
  assert.equal(rows[0].unlinkedItems, 2);
  assert.equal(totals.profit, 4000);
});

test("profit: LR shared by two contracts is split, no double count; zero revenue has null margin", () => {
  const lr = new Map([["a", { freight: 10000, status: "Booked" }]]);
  const { rows, totals } = buildTripProfit(
    [base({ _id: "1", items: [{ consignmentId: "a", cnNo: "1" }] }), base({ _id: "2", lhcNo: "LHC/2", items: [{ consignmentId: "a", cnNo: "1" }, { consignmentId: "a", cnNo: "1" }] }), base({ _id: "3", lhcNo: "LHC/3" })],
    lr
  );
  assert.equal(rows.find((r) => r._id === "1")?.revenue, 5000);
  assert.equal(rows.find((r) => r._id === "2")?.revenue, 5000);
  assert.equal(rows.find((r) => r._id === "3")?.marginPct, null);
  assert.equal(totals.lossTrips, 3);
});

test("vehicles: normalised key, latest driver, totals", () => {
  const v = aggregateVehicles([
    base({ _id: "1", lhcDate: "2026-09-01", vehicleNumber: "mh 23 au 6718", driverName: "Old", grossHire: 5000, truckType: "Tempo" }),
    base({ _id: "2", lhcDate: "2026-10-01", driverName: "Ramesh", ownerName: "Owner", supplierName: "S2" }),
    base({ _id: "3", status: "Cancelled", vehicleNumber: "RJ14GA0001" }),
  ]);
  assert.equal(v.length, 1);
  assert.equal(v[0].vehicleNumber, "MH23AU6718");
  assert.equal(v[0].trips, 2);
  assert.equal(v[0].totalHire, 15000);
  assert.equal(v[0].lastDriver, "Ramesh");
  assert.equal(v[0].truckType, "Tempo");
  assert.deepEqual(v[0].suppliers, ["S2", "S1"]);
});

test("drivers: merge by last 10 digits of mobile, fall back to name", () => {
  const d = aggregateDrivers([
    base({ _id: "1", lhcDate: "2026-09-01", driverName: "Ramesh", driverMobile: "+91 98765 43210" }),
    base({ _id: "2", lhcDate: "2026-10-01", driverName: "Ramesh K", driverMobile: "9876543210", vehicleNumber: "RJ14GA0001" }),
    base({ _id: "3", driverName: "Suresh" }),
    base({ _id: "4" }),
  ]);
  assert.equal(d.length, 2);
  const r = d.find((x) => x.mobile === "9876543210")!;
  assert.equal(r.trips, 2);
  assert.equal(r.name, "Ramesh K");
  assert.equal(r.vehicles.length, 2);
});
