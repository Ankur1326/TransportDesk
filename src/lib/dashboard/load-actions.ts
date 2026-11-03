import { buildActions } from "@/lib/dashboard/build-actions";
import dbConnect from "@/lib/db";
import { loadPipeline } from "@/lib/dashboard/load-pipeline";
import { loadReceivables } from "@/lib/dashboard/load-receivables";
import { type DashboardRange } from "@/lib/dashboard/shared";
import { actionSettingsMatch } from "@/lib/dashboard/loader-scopes";
import CompanySettings from "@/models/CompanySettings";
import type { PipelineLoad } from "@/lib/dashboard/load-pipeline";
import type { PartySnapshot } from "@/lib/dashboard/types";

export async function loadActions(
  companyId: string,
  range: DashboardRange,
  pipelinePromise: Promise<PipelineLoad> = loadPipeline(companyId),
  receivablesPromise: Promise<PartySnapshot> = loadReceivables(companyId, range)
) {
  await dbConnect();
  const [pipelineResult, receivablesResult, settingsResult] = await Promise.allSettled([
    pipelinePromise,
    receivablesPromise,
    CompanySettings.schema.path("creditDays")
      ? CompanySettings.findOne(actionSettingsMatch(companyId)).select("creditDays").lean<{ creditDays?: number } | null>()
      : Promise.resolve(null),
  ]);
  if (pipelineResult.status === "rejected") console.error("Dashboard action pipeline source failed:", pipelineResult.reason);
  if (receivablesResult.status === "rejected") console.error("Dashboard action receivables source failed:", receivablesResult.reason);
  if (settingsResult.status === "rejected") console.error("Dashboard action settings source failed:", settingsResult.reason);

  const pipeline = pipelineResult.status === "fulfilled" ? pipelineResult.value : null;
  const receivables = receivablesResult.status === "fulfilled" ? receivablesResult.value : null;
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const configuredDays = settings?.creditDays;
  return buildActions({
    ops: pipeline?.operations ?? null,
    receivables: receivables ?? null,
    creditDays: typeof configuredDays === "number" && Number.isFinite(configuredDays) ? configuredDays : 30,
  });
}
