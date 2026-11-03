/**
 * Rebuilds `Consignment.billing` ({ billed, billId, billNo, billedAt }) from the
 * freight bills. Safe to re-run: it only writes where the stored marker differs
 * from what the bills say, so a second run changes nothing.
 *
 * The app works without running this - stages and the "Billed" state are read
 * from the Bill documents - but run it once after deploying (and any time you
 * suspect drift) so the denormalised marker is complete for legacy LRs.
 *
 *   MONGODB_URI="mongodb+srv://..." [MONGODB_DB_NAME=UTS] \
 *     npx tsx scripts/reconcile-lr-billing.ts [--dry-run] [--company=<companyId>]
 *
 * - Sets the marker on every LR that is on a bill (latest bill wins when an LR is on several).
 * - Clears the marker on LRs that say they are billed but are on no bill any more.
 * - Never crosses companies: an LR is only touched by bills of its own company.
 * - Bills with no companyId are skipped and reported (run scripts/backfill-company-id.mjs first).
 */
import mongoose from "mongoose";

import { markersFromBills, sameMarker, type LrBillingMarker } from "../src/lib/bill/lr-billing";

const dry = process.argv.includes("--dry-run");
const onlyCompany = process.argv.find((a) => a.startsWith("--company="))?.split("=")[1];
const BATCH = 500;

const { MONGODB_URI, MONGODB_DB_NAME = "transportDesk" } = process.env;
if (!MONGODB_URI) throw new Error("Set MONGODB_URI");

interface BillDoc {
  _id: mongoose.Types.ObjectId;
  companyId?: string;
  billNo: string;
  billDate?: Date;
  items?: { consignmentId: mongoose.Types.ObjectId }[];
}
interface LrDoc {
  _id: mongoose.Types.ObjectId;
  billing?: { billed?: boolean; billId?: mongoose.Types.ObjectId; billNo?: string; billedAt?: Date };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  await mongoose.connect(`${MONGODB_URI}/${MONGODB_DB_NAME}`); // same URI shape as src/lib/db.ts
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");
  const bills = db.collection<BillDoc>("freightbills");
  const lrs = db.collection<LrDoc>("consignments");

  const billFilter: Record<string, unknown> = onlyCompany ? { companyId: onlyCompany } : {};
  const allBills = await bills
    .find(billFilter, { projection: { companyId: 1, billNo: 1, billDate: 1, "items.consignmentId": 1 } })
    .toArray();

  const skipped = allBills.filter((b) => !b.companyId).length;
  const byCompany = new Map<string, BillDoc[]>();
  for (const bill of allBills) {
    if (!bill.companyId) continue;
    const list = byCompany.get(bill.companyId) ?? [];
    list.push(bill);
    byCompany.set(bill.companyId, list);
  }

  let set = 0;
  let cleared = 0;
  let unchanged = 0;

  for (const [companyId, companyBills] of byCompany) {
    const markers = markersFromBills(
      companyBills.map((b) => ({
        id: String(b._id),
        billNo: b.billNo,
        billDate: b.billDate,
        lrIds: (b.items ?? []).map((i) => String(i.consignmentId)),
      }))
    );

    // 1) LRs that should be marked billed.
    const ids = [...markers.keys()];
    for (const part of chunk(ids, BATCH)) {
      const current = await lrs
        .find({ _id: { $in: part.map((id) => new mongoose.Types.ObjectId(id)) }, companyId } as never, { projection: { billing: 1 } })
        .toArray();
      const ops = [];
      for (const lr of current) {
        const want = markers.get(String(lr._id)) as LrBillingMarker;
        if (sameMarker(lr.billing, want)) {
          unchanged += 1;
          continue;
        }
        set += 1;
        ops.push({
          updateOne: {
            filter: { _id: lr._id, companyId } as never,
            update: { $set: { billing: { ...want, billId: new mongoose.Types.ObjectId(want.billId) } } },
          },
        });
      }
      if (ops.length && !dry) await lrs.bulkWrite(ops);
    }

    // 2) LRs that claim to be billed but are on no bill.
    const claiming = await lrs
      .find({ companyId, "billing.billed": true } as never, { projection: { _id: 1 } })
      .toArray();
    const stale = claiming.filter((lr) => !markers.has(String(lr._id)));
    for (const part of chunk(stale, BATCH)) {
      cleared += part.length;
      if (!dry) {
        await lrs.updateMany({ _id: { $in: part.map((lr) => lr._id) }, companyId } as never, { $unset: { billing: "" } });
      }
    }
  }

  // Companies with no bills at all may still carry stale markers.
  const companiesWithBills = [...byCompany.keys()];
  const orphanFilter: Record<string, unknown> = { "billing.billed": true };
  if (onlyCompany) orphanFilter.companyId = onlyCompany;
  else if (companiesWithBills.length) orphanFilter.companyId = { $nin: companiesWithBills };
  if (!onlyCompany || !byCompany.has(onlyCompany)) {
    const orphans = await lrs.countDocuments(orphanFilter as never);
    cleared += orphans;
    if (orphans && !dry) await lrs.updateMany(orphanFilter as never, { $unset: { billing: "" } });
  }

  console.log(
    `${dry ? "[dry run] would have " : ""}set ${set}, cleared ${cleared}, already correct ${unchanged}` +
      (skipped ? `; skipped ${skipped} bill(s) without a companyId` : "")
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
