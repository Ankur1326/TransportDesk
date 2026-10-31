#!/usr/bin/env node
/**
 * DEV ONLY. Seeds one supplier with a realistic ledger so the supplier screen can be checked by hand.
 *
 *   MONGODB_URI="mongodb://localhost:27017" [MONGODB_DB_NAME=UTS] COMPANY_ID="<your companyId>" \
 *     node scripts/seed-supplier-ledger-demo.mjs [--clean]
 *
 * Creates "Demo Sharma Transport" (everything is tagged by that name so --clean removes only it):
 *   opening balance   Rs 5,000 Payable (credit)
 *   LHC-DEMO-1        Rs 20,000, advance Rs 5,000       -> payments 8,000 + 4,000 -> Partial, Rs 3,000 due
 *   LHC-DEMO-2        hire 16,000 - deductions 500 - TDS 500 = Rs 15,000, nothing paid -> Unpaid
 *   LHC-DEMO-3        Rs 10,000, payment 10,000            -> "Final settlement", Paid
 *   manual Payable    Rs 750 (detention)
 *
 * EXPECTED (the supplier screen must show exactly this):
 *   total Payable (Cr) = 5,000 + 20,000 + 15,000 + 10,000 + 750 = Rs 50,750
 *   total Paid (Dr)    = 5,000 (advance) + 8,000 + 4,000 + 10,000 = Rs 27,000
 *   net balance        = Rs 23,750 Payable (Cr)  -> shown in the supplier list as 23,750 with a "Cr" pill
 */
import mongoose from "mongoose";

const clean = process.argv.includes("--clean");
const { MONGODB_URI, MONGODB_DB_NAME = "UTS", COMPANY_ID } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");
if (!COMPANY_ID) throw new Error("Set COMPANY_ID (the company the demo data belongs to)");
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");

await mongoose.connect(`${MONGODB_URI}/${MONGODB_DB_NAME}`);
const db = mongoose.connection;
const NAME = "Demo Sharma Transport";
const suppliers = db.collection("suppliers");
const contracts = db.collection("lorryhirecontracts");
const payments = db.collection("payments");

const existing = await suppliers.findOne({ companyId: COMPANY_ID, name: NAME });
if (existing) {
  await contracts.deleteMany({ companyId: COMPANY_ID, supplierId: existing._id });
  await payments.deleteMany({ companyId: COMPANY_ID, partyType: "supplier", partyId: existing._id });
  await suppliers.deleteOne({ _id: existing._id });
  console.log("removed previous demo data");
}
if (clean) {
  await mongoose.disconnect();
  process.exit(0);
}

const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
const now = new Date();
const { insertedId: supplierId } = await suppliers.insertOne({
  companyId: COMPANY_ID,
  name: NAME,
  address: "Transport Nagar",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  gstin: "",
  mobile: "9876543210",
  email: "",
  openingBalance: 5000,
  balanceType: "credit",
  createdAt: day("2026-07-01"),
  updatedAt: now,
});

const base = { companyId: COMPANY_ID, supplierId, supplierName: NAME, consignmentNos: [], createdAt: now, updatedAt: now, remark: "" };
const { insertedIds } = await contracts.insertMany([
  { ...base, contractNo: "LHC-DEMO-1", date: day("2026-08-01"), vehicleNo: "RJ14GA1234", hireAmount: 20000, otherCharges: 0, deductions: 0, tdsAmount: 0, totalPayable: 20000, advancePaid: 5000, advanceDate: "2026-08-01", advanceVia: "UPI" },
  { ...base, contractNo: "LHC-DEMO-2", date: day("2026-09-01"), vehicleNo: "RJ14GB5678", hireAmount: 16000, otherCharges: 0, deductions: 500, tdsAmount: 500, totalPayable: 15000, advancePaid: 0 },
  { ...base, contractNo: "LHC-DEMO-3", date: day("2026-09-10"), vehicleNo: "RJ14GC9012", hireAmount: 10000, otherCharges: 0, deductions: 0, tdsAmount: 0, totalPayable: 10000, advancePaid: 0 },
]);

const pay = (direction, amount, date, contractIdx, contractNo) => ({
  companyId: COMPANY_ID,
  partyType: "supplier",
  partyId: supplierId,
  partyName: NAME,
  direction,
  ...(contractIdx === undefined ? {} : { contractId: insertedIds[contractIdx], contractNo }),
  amount,
  date: day(date),
  mode: "NEFT",
  reference: "",
  remark: direction === "payable_adjustment" ? "Detention" : "",
  createdAt: now,
  updatedAt: now,
});
await payments.insertMany([
  pay("paid", 8000, "2026-08-10", 0, "LHC-DEMO-1"),
  pay("paid", 4000, "2026-08-20", 0, "LHC-DEMO-1"),
  pay("paid", 10000, "2026-09-15", 2, "LHC-DEMO-3"),
  pay("payable_adjustment", 750, "2026-09-20"),
]);

console.log(`seeded "${NAME}". Expected: Payable 50,750 | Paid 27,000 | Net 23,750 Cr`);
await mongoose.disconnect();
