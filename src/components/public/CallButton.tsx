import { Phone } from "@/components/icons";
import { buildTelLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface CallButtonProps {
  className?: string;
}

export function CallButton({ className }: CallButtonProps) {
  return (
    <a
      href={buildTelLink()}
      aria-label="Call us"
      className={cn(
        "focus-ring flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-800",
        className
      )}
    >
      <Phone className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}