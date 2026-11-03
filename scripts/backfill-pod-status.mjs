#!/usr/bin/env node
/**
 * OPTIONAL one-off: mark Delivered LRs that already have an uploaded POD file as
 * podStatus "Received". The app works without running this — LRs without a
 * podStatus simply read as "Pending" — but until you run it, every old LR that
 * already has a POD file will sit in the Pending POD tab and stay out of
 * "Ready to bill" until someone marks it received.
 *
 *   MONGODB_URI="mongodb+srv://..." [MONGODB_DB_NAME=UTS] [COMPANY_ID="<id>"] \
 *     node scripts/backfill-pod-status.mjs [--dry-run]
 *
 * Idempotent: only LRs with no podStatus are touched, so a second run changes
 * nothing. podReceivedAt is set from podUploadedAt (else deliveredAt, else now)
 * and a statusHistory note records the backfill. Cancelled / undelivered LRs and
 * LRs without a POD file are left alone.
 */
import mongoose from "mongoose";

const dry = process.argv.includes("--dry-run");
const { MONGODB_URI, MONGODB_DB_NAME = "UTS", COMPANY_ID } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");

await mongoose.connect(`${MONGODB_URI}/${MONGODB_DB_NAME}`);
const col = mongoose.connection.collection("consignments");

const filter = {
  status: "Delivered",
  podUrl: { $type: "string", $ne: "" },
  $or: [{ podStatus: { $exists: false } }, { podStatus: null }],
  ...(COMPANY_ID ? { companyId: COMPANY_ID } : {}),
};

const total = await col.countDocuments(filter);
console.log(`Delivered LRs with a POD file and no podStatus: ${total}${COMPANY_ID ? ` (company ${COMPANY_ID})` : ""}`);

if (!dry && total > 0) {
  const now = new Date();
  const result = await col.updateMany(filter, [
    {
      $set: {
        podStatus: "Received",
        podReceivedAt: { $ifNull: ["$podUploadedAt", { $ifNull: ["$deliveredAt", now]}] },
        statusHistory: {
          $concatArrays: [
            { $ifNull: ["$statusHistory", []] },
            [{ status: "Delivered", at: now, by: "", note: "POD Pending → Received: backfilled from existing POD file" }],
          ],
        },
      },
    },
  ]);
  console.log(`Updated ${result.modifiedCount} LRs.`);
} else if (dry) {
  console.log("Dry run — nothing written.");
}

await mongoose.disconnect();
