import { AlertTriangle } from "@/components/icons";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  /** Extra call-to-action rendered under the message (e.g. "Sign in again"). */
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load this",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-xl border border-error-100 bg-error-50 px-6 py-12 text-center",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-error-600" aria-hidden="true" />
      <h3 className="text-h4 font-semibold text-neutral-900">{title}</h3>
      <p className="max-w-sm text-body-sm text-neutral-600">{description}</p>
      {action}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}