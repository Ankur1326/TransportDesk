import Link from "next/link";
import { Truck } from "@/components/icons";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** "dark" for light backgrounds, "light" for dark ones. */
  tone?: "dark" | "light";
  showName?: boolean;
}

/** Logo mark + product name. Replaces the previous company-specific image logo. */
export function BrandMark({ className, tone = "dark", showName = true }: BrandMarkProps) {
  return (
    <Link href="/" className={cn("focus-ring inline-flex items-center gap-2.5 rounded-lg", className)} aria-label={`${brand.name} home`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
        <Truck className="h-5 w-5" aria-hidden="true" />
      </span>
      {showName && (
        <span className={cn("text-lg font-semibold tracking-tight", tone === "dark" ? "text-neutral-900" : "text-white")}>
          {brand.name}
        </span>
      )}
    </Link>
  );
}
