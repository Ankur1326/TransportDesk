import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompany } from "@/lib/company-scope";
import { DEFAULT_PERIOD, PERIOD_KEYS, resolvePeriod, type PeriodKey } from "@/lib/dashboard/periods";
import { loadActions } from "@/lib/dashboard/load-actions";
import { loadBookings } from "@/lib/dashboard/load-bookings";
import { loadFinancials } from "@/lib/dashboard/load-financials";
import { loadPayables } from "@/lib/dashboard/load-payables";
import { loadPipeline } from "@/lib/dashboard/load-pipeline";
import { loadReceivables } from "@/lib/dashboard/load-receivables";
import { loadSetup } from "@/lib/dashboard/load-setup";
import type { DashboardPayload, Widget } from "@/lib/dashboard/types";

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
  const pipelinePromise = loadPipeline(auth.companyId);
  const receivablesPromise = loadReceivables(auth.companyId, period);
  const results = await Promise.allSettled([
    loadSetup(auth.companyId),
    loadBookings(auth.companyId),
    loadFinancials(auth.companyId, period),
    receivablesPromise,
    loadPayables(auth.companyId, period),
    pipelinePromise,
    loadActions(auth.companyId, period, pipelinePromise, receivablesPromise),
  ]);
  const [setupResult, bookingsResult, financialsResult, receivablesResult, payablesResult, pipelineResult, actionsResult] = results;
  const pipeline = pipelineResult.status === "fulfilled" ? pipelineResult.value : null;
  if (pipelineResult.status === "rejected") console.error("Dashboard active trips widget failed:", pipelineResult.reason);
  if (setupResult.status === "rejected") console.error("Dashboard setup widget failed:", setupResult.reason);

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
    },
    setup: setupResult.status === "fulfilled" ? setupResult.value.setup : { error: true },
    bookings: settledWidget("bookings", bookingsResult),
    financials: settledWidget("financials", financialsResult),
    receivables: settledWidget("receivables", receivablesResult),
    payables: settledWidget("payables", payablesResult),
    activeTrips: pipeline?.activeTrips ?? { error: true },
    actions: settledWidget("actions", actionsResult),
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
