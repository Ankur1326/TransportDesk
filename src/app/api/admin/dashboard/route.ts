import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { requireCompany } from "@/lib/company-scope";
import { DEFAULT_PERIOD, PERIOD_KEYS, resolvePeriod, type PeriodKey } from "@/lib/dashboard/periods";
import { loadActivity } from "@/lib/dashboard/load-activity";
import { loadActions } from "@/lib/dashboard/load-actions";
import { loadKpis } from "@/lib/dashboard/load-kpis";
import { loadFinancials } from "@/lib/dashboard/load-financials";
import { loadPayables } from "@/lib/dashboard/load-payables";
import { loadPipeline } from "@/lib/dashboard/load-pipeline";
import { loadReceivables } from "@/lib/dashboard/load-receivables";
import { loadSetup } from "@/lib/dashboard/load-setup";
import { loadTrends } from "@/lib/dashboard/load-trends";
import type { DashboardPayload, Widget } from "@/lib/dashboard/types";
import type { SetupState } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  period: z.enum(PERIOD_KEYS).default(DEFAULT_PERIOD),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function settledWidget<T>(name: string, result: PromiseSettledResult<T>): Widget<T> {
  if (result.status === "fulfilled") return result.value;
  console.error(`Dashboard ${name} widget failed:`, result.reason);
  return { error: true };
}

export async function GET(request: NextRequest) {
  const auth = await requireCompany();
  if (!auth.ok) return auth.response;

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid dashboard query." },
      { status: 400 }
    );
  }
  const now = new Date();
  const resolved = resolvePeriod(parsed.data.period as PeriodKey, now, {
    from: parsed.data.from,
    to: parsed.data.to,
  });
  if (!resolved.ok) {
    return NextResponse.json({ success: false, message: resolved.message }, { status: 400 });
  }
  const period = resolved.period;

  const results = await Promise.allSettled([
    (async () => { await dbConnect(); return loadSetup(auth.companyId); })(),
    loadKpis(auth.companyId, period),
    loadFinancials(auth.companyId, period),
    loadReceivables(auth.companyId, period),
    loadPayables(auth.companyId, period),
    loadPipeline(auth.companyId, period),
    loadActions(auth.companyId, period),
    loadTrends(auth.companyId, period),
    loadActivity(auth.companyId, period),
  ]);
  const [setupResult, kpisResult, financialsResult, receivablesResult, payablesResult, pipelineResult, actionsResult, trendsResult, activityResult] = results;
  const setupLoad = setupResult.status === "fulfilled" ? setupResult.value : null;
  if (setupResult.status === "rejected") console.error("Dashboard setup widget failed:", setupResult.reason);
  const pipelineLoad = settledWidget("pipeline", pipelineResult);
  const payload: DashboardPayload = {
    meta: {
      generatedAt: now.toISOString(),
      timezone: "Asia/Kolkata",
      currency: "INR",
      moneyUnit: "rupees",
      period: {
        key: period.key,
        label: period.label,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        previousFrom: period.previousFrom.toISOString(),
        previousTo: period.previousTo.toISOString(),
        compareLabel: period.compareLabel,
        fromYmd: period.fromYmd,
        toYmd: period.toYmd,
      },
      capabilities: setupLoad?.capabilities ?? {
        podStatus: false,
        billingMarker: false,
        vehicleMaster: false,
        driverMaster: false,
      },
      creditDays: 30,
    },
    company: setupLoad?.company ?? { name: null },
    setup: setupLoad?.setup ?? ({ error: true } satisfies Widget<SetupState>),
    kpis: settledWidget("kpis", kpisResult),
    financials: settledWidget("financials", financialsResult),
    receivables: settledWidget("receivables", receivablesResult),
    payables: settledWidget("payables", payablesResult),
    pipeline: pipelineLoad && !("error" in pipelineLoad) ? pipelineLoad.pipeline : pipelineLoad,
    activeTrips: pipelineLoad && !("error" in pipelineLoad) ? pipelineLoad.activeTrips : pipelineLoad,
    lhc: pipelineLoad && !("error" in pipelineLoad) ? pipelineLoad.lhc : pipelineLoad,
    actions: settledWidget("actions", actionsResult),
    trends: settledWidget("trends", trendsResult),
    recent: settledWidget("activity", activityResult),
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
