#!/usr/bin/env node
/**
 * One-off migration for the consignment (bilty) module. Safe to re-run.
 *
 *   MONGODB_URI="mongodb+srv://..." COMPANY_ID="<transporter user _id>" \
 *     node scripts/migrate-consignments.mjs [--dry-run]
 *
 * 1. status        -> "Booked" for LRs that have none (legacy data)
 * 2. companyId     -> COMPANY_ID for LRs that have none (single-tenant backfill)
 * 3. indexes       -> drops the old global unique `consignmentNumber_1` index so
 *                     numbers are unique per company, then builds the new indexes
 *
 * After it succeeds you can set ALLOW_LEGACY_UNSCOPED = false in
 * src/lib/company-scope.ts to fully isolate companies.
 */
import mongoose from "mongoose";

const dry = process.argv.includes("--dry-run");
const { MONGODB_URI, COMPANY_ID } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");

await mongoose.connect(`${MONGODB_URI}/UTS`);
const col = mongoose.connection.collection("consignments");

const noStatus = { $or: [{ status: { $exists: false } }, { status: null }, { status: "" }] };
const noCompany = { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] };

console.log("LRs without status:   ", await col.countDocuments(noStatus));
console.log("LRs without companyId:", await col.countDocuments(noCompany));

if (!dry) {
  const s = await col.updateMany(noStatus, { $set: { status: "Booked" } });
  console.log("status backfilled:", s.modifiedCount);

  if (COMPANY_ID) {
    const c = await col.updateMany(noCompany, { $set: { companyId: COMPANY_ID } });
    console.log("companyId backfilled:", c.modifiedCount);
  } else {
    console.log("COMPANY_ID not set — skipped companyId backfill");
  }

  const indexes = await col.indexes();
  if (indexes.some((i) => i.name === "consignmentNumber_1" && i.unique)) {
    await col.dropIndex("consignmentNumber_1");
    console.log("dropped legacy unique index consignmentNumber_1");
  }
  await col.createIndex({ consignmentNumber: 1 });
  await col.createIndex({ companyId: 1, consignmentNumber: 1 }, { unique: true });
  await col.createIndex({ companyId: 1, status: 1, bookingDate: -1 });
  console.log("indexes ready");
} else {
  console.log("(dry run — nothing written)");
}

await mongoose.disconnect();
