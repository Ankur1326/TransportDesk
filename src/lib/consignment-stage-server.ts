import mongoose from "mongoose";

import ConsignmentModel from "@/models/Consignment";
import { loadLrBillInfo, type LrBillInfo } from "@/lib/ledger/load-ledger";
import { getLrStage, tallyStages, type LrStage, type StageCounts } from "@/lib/consignment-stage";

/**
 * Server-only helpers that turn LRs into trip stages. The bill (and its
 * payments) is read from the Bill documents through the ledger's own helper,
 * so legacy LRs without a `billing` marker are staged correctly.
 */

type Filter = Record<string, unknown>;

interface StageSource {
  _id: mongoose.Types.ObjectId;
  status?: string;
  podStatus?: string;
  podUrl?: string;
}

/** Stage of every LR matching `query` (one lean read + one bill read). */
export async function stageEveryLr(companyId: string, query: Filter): Promise<{ id: string; stage: LrStage }[]> {
  const [lrs, bills] = await Promise.all([
    ConsignmentModel.find(query).select("status podStatus podUrl").lean<StageSource[]>(),
    loadLrBillInfo(companyId),
  ]);
  return lrs.map((lr) => ({ id: String(lr._id), stage: getLrStage(lr, bills.get(String(lr._id))) }));
}

/** Per-stage totals for the LRs matching `query`. */
export async function countStages(companyId: string, query: Filter): Promise<StageCounts> {
  return tallyStages(await stageEveryLr(companyId, query));
}

/** Ids of the LRs matching `query` that are currently in `stage`. */
export async function idsInStage(companyId: string, query: Filter, stage: LrStage): Promise<mongoose.Types.ObjectId[]> {
  return (await stageEveryLr(companyId, query))
    .filter((r) => r.stage === stage)
    .map((r) => new mongoose.Types.ObjectId(r.id));
}

export interface LrStageFields {
  stage: LrStage;
  billInfo: LrBillInfo | null;
}

/** Adds `stage` and `billInfo` to each row (a page of the list, or one LR). */
export async function withStages<T extends StageSource>(companyId: string, rows: T[]): Promise<(T & LrStageFields)[]> {
  const bills = await loadLrBillInfo(companyId, rows.map((r) => String(r._id)));
  return rows.map((row) => {
    const billInfo = bills.get(String(row._id)) ?? null;
    return { ...row, stage: getLrStage(row, billInfo), billInfo };
  });
}
