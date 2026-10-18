import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardLabelProps {
  title: string;
  /** Optional small icon shown before the title. */
  icon?: ReactNode;
  /** Optional content on the right side (a count, a button, a status). */
  right?: ReactNode;
  className?: string;
}

/**
 * Compact blue title bar for the top of a card.
 *
 * The parent card should have `overflow-hidden` and its own rounding
 * (e.g. `rounded-xl`); the label inherits that rounding on its top corners.
 */
export function CardLabel({ title, icon, right, className }: CardLabelProps) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-center justify-between gap-2 rounded-t-[inherit]",
        "bg-brand-700 px-3 py-1.5 text-white dark:bg-blue-700",
        className
      )}
    >
      <h3 className="flex min-w-0 items-center gap-1.5 text-xs font-semibold leading-tight">
        {icon ? (
          <span aria-hidden="true" className="shrink-0 [&>svg]:size-3.5">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </h3>
      {right ? <div className="shrink-0 text-xs font-medium">{right}</div> : null}
    </div>
  );
}