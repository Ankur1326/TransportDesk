import { AlertTriangle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/Button";
import { Card, CardTitle } from "@/components/ui/Card";

export function WidgetUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2 py-2 text-xs text-neutral-500 dark:text-neutral-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Couldn&apos;t load.</span>
      <Button type="button" variant="ghost" size="sm" onClick={onRetry} className="h-auto min-h-0 p-0 text-xs">
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 rounded-lg border-neutral-200 bg-white p-4 dark:border-brand-800 dark:bg-brand-900 ${className}`}>
      <div className={subtitle ? "mb-3" : "mb-2"}>
        <CardTitle className="text-sm font-semibold text-neutral-950 dark:text-white">{title}</CardTitle>
        {subtitle && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}
