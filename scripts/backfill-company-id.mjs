#!/usr/bin/env node
/**
 * One-off migration to company-scoped data. Safe to re-run.
 *
 *   MONGODB_URI="mongodb+srv://..." [MONGODB_DB_NAME=UTS] [COMPANY_ID="<id>"] \
 *     node scripts/backfill-company-id.mjs [--dry-run]
 *
 * 1. users      -> every user without `companyId` gets one (their own id, so data
 *                  they already created stays attached) + a Company document.
 * 2. documents  -> customers / freightbills / consignments with no `companyId`
 *                  get the companyId of the user in `createdBy`. Anything with no
 *                  `createdBy` (all old customers) is assigned to COMPANY_ID if
 *                  you set it; otherwise it is only reported.
 * 3. indexes    -> drops the old GLOBAL unique indexes (customers.name_1,
 *                  freightbills.billNo_1, consignments.consignmentNumber_1) and
 *                  builds the per-company unique ones.
 */
import mongoose from "mongoose";

const dry = process.argv.includes("--dry-run");
const { MONGODB_URI, MONGODB_DB_NAME = "UTS", COMPANY_ID } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");

await mongoose.connect(`${MONGODB_URI}/${MONGODB_DB_NAME}`);
const db = mongoose.connection;
const missing = { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: "" }] };

// 1. users + companies
const users = db.collection("users");
const companies = db.collection("companies");
const unlinked = await users.find(missing).project({ _id: 1, fullName: 1 }).toArray();
console.log("users without companyId:", unlinked.length);
if (!dry) {
  for (const u of unlinked) {
    await companies.updateOne(
      { _id: u._id },
      { $setOnInsert: { name: u.fullName ?? "", ownerUserId: String(u._id), createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
    await users.updateOne({ _id: u._id }, { $set: { companyId: String(u._id) } });
  }
}

// 2. documents
for (const name of ["customers", "freightbills", "consignments"]) {
  const col = db.collection(name);
  console.log(`\n${name}: ${await col.countDocuments(missing)} without companyId`);
  if (dry) continue;

  const creators = await col.distinct("createdBy", { ...missing, createdBy: { $ne: null } });
  for (const creator of creators) {
    const owner = await users.findOne({ _id: creator }, { projection: { companyId: 1 } });
    if (!owner?.companyId) continue;
    const r = await col.updateMany({ ...missing, createdBy: creator }, { $set: { companyId: owner.companyId } });
    console.log(`  createdBy ${creator} -> ${owner.companyId}: ${r.modifiedCount}`);
  }
  if (COMPANY_ID) {
    const r = await col.updateMany(missing, { $set: { companyId: COMPANY_ID } });
    console.log(`  remaining -> COMPANY_ID: ${r.modifiedCount}`);
  }
  const left = await col.countDocuments(missing);
  if (left) console.log(`  !! ${left} still have no companyId (hidden from every company). Re-run with COMPANY_ID=<id>.`);
}

// 3. indexes
async function dropGlobalUnique(colName, field) {
  const col = db.collection(colName);
  let indexes = [];
  try { indexes = await col.indexes(); } catch { return; }
  for (const i of indexes) {
    if (i.unique && Object.keys(i.key).length === 1 && i.key[field] === 1) {
      console.log(`dropping ${colName}.${i.name}`);
      if (!dry) await col.dropIndex(i.name);
    }
  }
}
await dropGlobalUnique("customers", "name");
await dropGlobalUnique("freightbills", "billNo");
await dropGlobalUnique("consignments", "consignmentNumber");

if (!dry) {
  await db.collection("customers").createIndex({ companyId: 1, name: 1 }, { unique: true });
  await db.collection("freightbills").createIndex({ companyId: 1, billNo: 1 }, { unique: true });
  await db.collection("consignments").createIndex({ companyId: 1, consignmentNumber: 1 }, { unique: true });
  console.log("\nindexes ready");
} else {
  console.log("\n(dry run — nothing written)");
}

await mongoose.disconnect();
