import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

interface LoadingProps {
  label?: string;
  className?: string;
  /** Renders centered in a full-height block — use for page/section-level loading states. */
  fullPage?: boolean;
}

export function Loading({ label = "Loading…", className, fullPage = false }: LoadingProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 text-body-sm text-neutral-500",
        fullPage && "min-h-[40vh] flex-col gap-3",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-brand-600", fullPage ? "h-8 w-8" : "h-4 w-4")} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}