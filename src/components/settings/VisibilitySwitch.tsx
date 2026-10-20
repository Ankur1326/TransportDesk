"use client";

import { cn } from "@/lib/utils";

/**
 * Small on/off switch used next to a company detail to choose whether it is
 * printed on documents (LR, freight bill, ...).
 */
export function VisibilitySwitch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Name of the thing being toggled, e.g. "GSTIN" — used for the accessible label. */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Show ${label} on documents`}
      title={checked ? `${label} is shown on documents` : `${label} is hidden on documents`}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-brand-600" : "bg-neutral-300",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[16px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
