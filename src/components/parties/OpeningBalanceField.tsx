"use client";

import FormInput from "@/components/FormInput";
import type { BalanceType } from "@/lib/opening-balance";

interface Props {
  amount: string;
  type: BalanceType;
  onAmountChange: (value: string) => void;
  onTypeChange: (value: BalanceType) => void;
  /** Label for each tab, e.g. CUSTOMER_BALANCE_LABELS. */
  labels: Record<BalanceType, string>;
}

/** Opening balance amount + the two-tab Debit / Credit selector. */
export function OpeningBalanceField({ amount, type, onAmountChange, onTypeChange, labels }: Props) {
  return (
    <div>
      <div role="tablist" aria-label="Balance type" className="mb-3 flex">
        {(["debit", "credit"] as const).map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTypeChange(t)}
              className={`flex-1 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-red-500 bg-white text-red-500 dark:bg-transparent"
                  : "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>
      <FormInput
        label="Opening Balance"
        type="number"
        min={0}
        max={999999999}
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0.00"
      />
    </div>
  );
}
