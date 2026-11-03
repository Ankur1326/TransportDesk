const numeric = (expression: string) => ({
  $convert: { input: expression, to: "double", onError: 0, onNull: 0 },
});

const LEGACY_CHARGES = [
  "freightAmt",
  "lrCharges",
  "detentionCharges",
  "unloadingCharges",
  "loadingCharges",
  "gstinCharges",
] as const;

function billItemAmount(item: string) {
  const chargeLines = `${item}.chargeLines`;
  return {
    $cond: [
      { $isArray: chargeLines },
      {
        $reduce: {
          input: chargeLines,
          initialValue: 0,
          in: { $add: ["$$value", numeric("$$this.amount")] },
        },
      },
      { $add: LEGACY_CHARGES.map((key) => numeric(`${item}.${key}`)) },
    ],
  };
}

const items = { $cond: [{ $isArray: "$items" }, "$items", []] };

const billSubtotal = {
  $reduce: {
    input: items,
    initialValue: 0,
    in: { $add: ["$$value", billItemAmount("$$this")] },
  },
};

const hasBillLineSource = {
  $gt: [
    {
      $size: {
        $filter: {
          input: items,
          as: "item",
          cond: {
            $or: [
              { $isArray: "$$item.chargeLines" },
              ...LEGACY_CHARGES.map((key) => ({ $ne: [`$$item.${key}`, null] })),
            ],
          },
        },
      },
    },
    0,
  ],
};

/**
 * The trip total follows computeItemTotal (chargeLines when present, otherwise
 * the legacy charge fields), then mirrors computeBillSummary's taxable formula:
 * round2(tripTotal - min(max(discount, 0), tripTotal)). GST, TDS, advance and
 * round-off do not affect revenue. When line totals are absent on a legacy bill,
 * totalAmount is the only persisted fallback; it can include tax/withholding.
 */
export function billTaxableValueExpression() {
  const discount = {
    $min: [billSubtotal, { $max: [0, numeric("$adjustments.discount")] }],
  };
  const derived = {
    $round: [{ $subtract: [billSubtotal, discount] }, 2],
  };
  return {
    $cond: [
      hasBillLineSource,
      { $max: [0, derived] },
      { $round: [numeric("$totalAmount"), 2] },
    ],
  };
}

export function hireCostExpression() {
  return { $round: [numeric("$settlement.grossHire"), 2] };
}
