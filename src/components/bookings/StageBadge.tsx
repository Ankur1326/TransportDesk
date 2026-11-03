"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { STAGE_FLOW, stageIndex, type LrStage } from "@/lib/consignment-stage";
import { formatINR } from "@/lib/lr-helpers";
import type { LrBillSummary } from "@/lib/api/consignments";

type Variant = "neutral" | "brand" | "success" | "warning" | "error" | "info";

export const STAGE_VARIANT: Record<LrStage, Variant> = {
  Booked: "warning",
  "On Route": "info",
  Delivered: "success",
  "POD Received": "brand",
  Billed: "info",
  "Partially Paid": "warning",
  Paid: "success",
  Cancelled: "error",
};

/** The LR's single trip stage as a pill. */
export function StageBadge({ stage, className }: { stage: LrStage; className?: string }) {
  return (
    <Badge variant={STAGE_VARIANT[stage]} className={className} title={`Trip stage: ${stage}`}>
      {stage}
    </Badge>
  );
}

/** Bill number and what is still unpaid, shown next to a billed LR. */
export function BillLine({ bill }: { bill: LrBillSummary | null | undefined }) {
  if (!bill) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-body-sm text-neutral-500">
      Bill <span className="font-medium text-neutral-700">{bill.billNo}</span>
      {bill.status === "Paid" ? (
        <span className="text-success-700">· fully paid</span>
      ) : (
        <span>· {formatINR(bill.outstanding)} due</span>
      )}
    </span>
  );
}

/** Horizontal stepper: Booked → … → Paid. Cancelled is shown as a single red pill instead. */
export function StageStepper({ stage }: { stage: LrStage }) {
  if (stage === "Cancelled") return <StageBadge stage="Cancelled" />;
  const current = stageIndex(stage);

  return (
    <ol className="flex w-full items-start gap-0 overflow-x-auto pb-1" aria-label={`Trip stage: ${stage}`}>
      {STAGE_FLOW.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex min-w-[64px] flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : i <= current ? "bg-brand-600" : "bg-neutral-200"}`} />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                  done
                    ? "border-brand-600 bg-brand-600 text-white"
                    : active
                      ? "border-brand-600 bg-white text-brand-700 ring-2 ring-brand-200"
                      : "border-neutral-300 bg-white text-neutral-400"
                }`}
              >
                {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === STAGE_FLOW.length - 1 ? "bg-transparent" : i < current ? "bg-brand-600" : "bg-neutral-200"}`} />
            </div>
            <span className={`mt-1 text-[10px] leading-tight ${active ? "font-semibold text-brand-700" : "text-neutral-500"}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
